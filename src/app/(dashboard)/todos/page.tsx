'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Trash2, Square, CheckSquare2, X, Calendar, Flag } from "lucide-react";

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
  createdAt: string;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as Todo['priority'],
    dueDate: '',
    tags: ''
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/todos');
      const data = await response.json();
      setTodos(data.todos || []);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTodo = async () => {
    if (!newTodo.title.trim()) return;
    
    const todo: Todo = {
      id: Date.now().toString(),
      title: newTodo.title,
      description: newTodo.description || undefined,
      completed: false,
      priority: newTodo.priority,
      dueDate: newTodo.dueDate || undefined,
      tags: newTodo.tags ? newTodo.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', todo }),
      });
      setTodos([todo, ...todos]);
      setNewTodo({ title: '', description: '', priority: 'medium', dueDate: '', tags: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const toggleTodo = async (todoId: string) => {
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', todoId }),
      });
      setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t));
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', todoId }),
      });
      setTodos(todos.filter(t => t.id !== todoId));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const priorityColors = {
    low: 'border-zinc-500 text-zinc-500',
    medium: 'border-yellow-500 text-yellow-500',
    high: 'border-red-500 text-red-500',
  };

  const priorityIcons = {
    low: <Flag className="w-3 h-3" />,
    medium: <Flag className="w-3 h-3" />,
    high: <Flag className="w-3 h-3 fill-current" />,
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-orange-500" />
            To-Do List
          </h1>
          <p className="text-zinc-400">Tasks and action items</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'New Task'}
        </Button>
      </div>

      {/* Add Todo Form */}
      {showForm && (
        <Card className="mb-6 bg-zinc-900/50 border-zinc-800 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              Create New Task
            </CardTitle>
            <CardDescription>Add a task to your to-do list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Task Title *</label>
              <Input
                placeholder="e.g., Review quarterly report"
                value={newTodo.title}
                onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Description</label>
              <Textarea
                placeholder="Additional details about this task..."
                value={newTodo.description}
                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Priority</label>
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as Todo['priority'] })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Due Date</label>
                <Input
                  type="date"
                  value={newTodo.dueDate}
                  onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Tags</label>
                <Input
                  placeholder="work, urgent"
                  value={newTodo.tags}
                  onChange={(e) => setNewTodo({ ...newTodo, tags: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={addTodo} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700 text-zinc-300">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <Button
            key={f}
            variant="outline"
            size="sm"
            onClick={() => setFilter(f)}
            className={`capitalize ${filter === f ? 'bg-zinc-800 text-white border-orange-500' : 'border-zinc-700 text-zinc-400'}`}
          >
            {f}
          </Button>
        ))}
        <span className="ml-auto text-sm text-zinc-500">
          {filteredTodos.filter(t => !t.completed).length} active, {filteredTodos.filter(t => t.completed).length} completed
        </span>
      </div>

      {/* Todo List */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : filteredTodos.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <CheckSquare2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">
              {filter === 'all' ? 'No tasks yet. Create one above!' : `No ${filter} tasks`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTodos.map((todo) => (
            <Card key={todo.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleTodo(todo.id)} className="mt-1 flex-shrink-0">
                    {todo.completed ? (
                      <CheckSquare2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${todo.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                        {todo.title}
                      </span>
                      <Badge variant="outline" className={priorityColors[todo.priority]}>
                        {priorityIcons[todo.priority]}
                        <span className="ml-1">{todo.priority}</span>
                      </Badge>
                      {todo.dueDate && (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(todo.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    {todo.description && (
                      <p className="text-zinc-500 text-sm mt-1">{todo.description}</p>
                    )}
                    {todo.tags && todo.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {todo.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="text-zinc-500 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
