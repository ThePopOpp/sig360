import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (GATEWAY_TOKEN) {
      headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
    }

    // Send message to main session via chat completions with session routing
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        stream: false,
        // Route to main session for shared context
        session: 'main',
        // Include source info
        metadata: {
          source: 'dashboard',
          channel: 'web'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gateway error:', response.status, errorText);
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'No response';

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch conversation history
export async function GET() {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (GATEWAY_TOKEN) {
      headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
    }

    // Fetch main session history
    const response = await fetch(`${GATEWAY_URL}/api/sessions/main/history?limit=50`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json({ messages: [] });
    }

    const data = await response.json();
    return NextResponse.json({ messages: data.messages || [] });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json({ messages: [] });
  }
}
