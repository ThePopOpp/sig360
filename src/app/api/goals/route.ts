import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data');
const GOALS_FILE = path.join(DATA_PATH, 'goals.json');

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

async function readGoals(): Promise<Goal[]> {
  try {
    const content = await fs.readFile(GOALS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeGoals(goals: Goal[]): Promise<void> {
  await fs.mkdir(DATA_PATH, { recursive: true });
  await fs.writeFile(GOALS_FILE, JSON.stringify(goals, null, 2), 'utf-8');
}

export async function GET() {
  const goals = await readGoals();
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, goal, goalId, status } = body;
    let goals = await readGoals();

    if (action === 'add' && goal) {
      goals = [goal, ...goals];
    } else if (action === 'update' && goalId && status) {
      goals = goals.map(g => 
        g.id === goalId 
          ? { ...g, status, updatedAt: new Date().toISOString() } 
          : g
      );
    } else if (action === 'delete' && goalId) {
      goals = goals.filter(g => g.id !== goalId);
    }

    await writeGoals(goals);
    return NextResponse.json({ success: true, goals });
  } catch (error) {
    console.error('Error updating goals:', error);
    return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 });
  }
}
