import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { device_id, uid, status, action_type } = body;

    if (!device_id || !uid) {
      return NextResponse.json(
        { error: 'Missing required parameters: device_id and uid are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('access_logs')
      .insert([
        {
          device_id,
          card_uid: uid,
          status: status || 'AUTHORIZED',
          action_type: action_type || 'RFID_SCAN',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}