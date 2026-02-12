import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data');
const TODOS_FILE = path.join(DATA_PATH, 'todos.json');

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

async function readTodos(): Promise<Todo[]> {
  try {
    const content = await fs.readFile(TODOS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeTodos(todos: Todo[]): Promise<void> {
  await fs.mkdir(DATA_PATH, { recursive: true });
  await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf-8');
}

export async function GET() {
  const todos = await readTodos();
  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, todo, todoId } = body;
    let todos = await readTodos();

    if (action === 'add' && todo) {
      todos = [todo, ...todos];
    } else if (action === 'toggle' && todoId) {
      todos = todos.map(t => 
        t.id === todoId ? { ...t, completed: !t.completed } : t
      );
    } else if (action === 'delete' && todoId) {
      todos = todos.filter(t => t.id !== todoId);
    }

    await writeTodos(todos);
    return NextResponse.json({ success: true, todos });
  } catch (error) {
    console.error('Error updating todos:', error);
    return NextResponse.json({ error: 'Failed to update todos' }, { status: 500 });
  }
}
