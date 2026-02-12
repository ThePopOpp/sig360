// File utilities for reading/writing workspace files
import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_PATH = process.env.OPENCLAW_WORKSPACE || '/root/.openclaw/workspace';
const DATA_PATH = path.join(process.cwd(), 'data');

// DNA Files
export const DNA_FILES = {
  soul: 'SOUL.md',
  identity: 'IDENTITY.md',
  user: 'USER.md',
  agents: 'AGENTS.md',
  tools: 'TOOLS.md',
};

// Memory paths
export const MEMORY_FILE = 'MEMORY.md';
export const MEMORY_DIR = 'memory';

export async function readWorkspaceFile(filename: string): Promise<string | null> {
  try {
    const filePath = path.join(WORKSPACE_PATH, filename);
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function writeWorkspaceFile(filename: string, content: string): Promise<boolean> {
  try {
    const filePath = path.join(WORKSPACE_PATH, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export async function listMemoryFiles(): Promise<string[]> {
  try {
    const memoryPath = path.join(WORKSPACE_PATH, MEMORY_DIR);
    const files = await fs.readdir(memoryPath);
    return files.filter(f => f.endsWith('.md')).sort().reverse();
  } catch {
    return [];
  }
}

export async function readMemoryFile(filename: string): Promise<string | null> {
  return readWorkspaceFile(path.join(MEMORY_DIR, filename));
}

export async function writeMemoryFile(filename: string, content: string): Promise<boolean> {
  return writeWorkspaceFile(path.join(MEMORY_DIR, filename), content);
}

// Data files (goals, todos, missions)
export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'in-progress' | 'completed' | 'blocked';
  priority: number;
  createdAt: string;
  updatedAt: string;
}

async function readDataFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(DATA_PATH, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeDataFile<T>(filename: string, data: T[]): Promise<boolean> {
  try {
    const filePath = path.join(DATA_PATH, filename);
    await fs.mkdir(DATA_PATH, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export async function getGoals(): Promise<Goal[]> {
  return readDataFile<Goal>('goals.json');
}

export async function saveGoals(goals: Goal[]): Promise<boolean> {
  return writeDataFile('goals.json', goals);
}

export async function getTodos(): Promise<Todo[]> {
  return readDataFile<Todo>('todos.json');
}

export async function saveTodos(todos: Todo[]): Promise<boolean> {
  return writeDataFile('todos.json', todos);
}

export async function getMissions(): Promise<Mission[]> {
  return readDataFile<Mission>('missions.json');
}

export async function saveMissions(missions: Mission[]): Promise<boolean> {
  return writeDataFile('missions.json', missions);
}
