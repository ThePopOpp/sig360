import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data');
const MISSIONS_FILE = path.join(DATA_PATH, 'missions.json');

interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'in-progress' | 'completed' | 'blocked';
  priority: number;
  createdAt: string;
  updatedAt: string;
}

async function readMissions(): Promise<Mission[]> {
  try {
    const content = await fs.readFile(MISSIONS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeMissions(missions: Mission[]): Promise<void> {
  await fs.mkdir(DATA_PATH, { recursive: true });
  await fs.writeFile(MISSIONS_FILE, JSON.stringify(missions, null, 2), 'utf-8');
}

export async function GET() {
  const missions = await readMissions();
  return NextResponse.json({ missions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mission, missionId, status, missions: newMissions } = body;
    let missions = await readMissions();

    if (action === 'add' && mission) {
      missions = [...missions, mission];
    } else if (action === 'update' && missionId && status) {
      missions = missions.map(m => 
        m.id === missionId 
          ? { ...m, status, updatedAt: new Date().toISOString() } 
          : m
      );
    } else if (action === 'delete' && missionId) {
      missions = missions.filter(m => m.id !== missionId);
    } else if (action === 'reorder' && newMissions) {
      missions = newMissions;
    }

    await writeMissions(missions);
    return NextResponse.json({ success: true, missions });
  } catch (error) {
    console.error('Error updating missions:', error);
    return NextResponse.json({ error: 'Failed to update missions' }, { status: 500 });
  }
}
