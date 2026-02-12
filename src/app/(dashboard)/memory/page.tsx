'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw, Brain, FileText, Calendar, Plus, X, Trash2 } from "lucide-react";

interface MemoryFile {
  name: string;
  content: string;
}

export default function MemoryPage() {
  const [memoryMd, setMemoryMd] = useState('');
  const [dailyFiles, setDailyFiles] = useState<MemoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'daily' as 'daily' | 'note',
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/memory');
      const data = await response.json();
      setMemoryMd(data.memory || '');
      setDailyFiles(data.dailyFiles || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading memory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMemory = async () => {
    setIsSaving(true);
    try {
      const filename = selectedFile || 'MEMORY.md';
      const content = selectedFile ? selectedContent : memoryMd;

      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving memory:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const createEntry = async () => {
    if (!newEntry.content.trim()) return;

    let filename: string;
    let content: string;

    if (newEntry.type === 'daily') {
      filename = `${newEntry.date}.md`;
      content = `# ${newEntry.date}\n\n${newEntry.title ? `## ${newEntry.title}\n\n` : ''}${newEntry.content}`;
    } else {
      filename = `${newEntry.title.toLowerCase().replace(/\s+/g, '-')}.md`;
      content = `# ${newEntry.title}\n\n${newEntry.content}`;
    }

    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });

      setNewEntry({
        type: 'daily',
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      loadMemory();
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const selectFile = (file: MemoryFile | null) => {
    if (file) {
      setSelectedFile(file.name);
      setSelectedContent(file.content);
    } else {
      setSelectedFile(null);
      setSelectedContent('');
    }
    setHasChanges(false);
  };

  const handleContentChange = (content: string) => {
    if (selectedFile) {
      setSelectedContent(content);
    } else {
      setMemoryMd(content);
    }
    setHasChanges(true);
  };

  return (
    <div className="flex h-full p-8 gap-6">
      {/* Sidebar - File List */}
      <Card className="w-72 flex-shrink-0 bg-zinc-900/50 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-orange-500" />
              Memory
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="text-orange-500 hover:text-orange-400"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <CardDescription>Long-term and daily memory</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-340px)]">
            <div className="p-2">
              {/* MEMORY.md */}
              <button
                onClick={() => selectFile(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  !selectedFile
                    ? 'bg-orange-500/20 text-orange-500'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span className="font-medium">MEMORY.md</span>
                <Badge variant="outline" className="ml-auto text-xs border-orange-500 text-orange-500">
                  Main
                </Badge>
              </button>

              <Separator className="my-3 bg-zinc-800" />

              {/* Daily Files */}
              <div className="px-3 py-1 text-xs text-zinc-500 uppercase tracking-wider">
                Daily Logs
              </div>
              {dailyFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => selectFile(file)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedFile === file.name
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{file.name}</span>
                </button>
              ))}
              {dailyFiles.length === 0 && (
                <div className="px-3 py-4 text-sm text-zinc-500">
                  No daily logs yet
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        {/* New Entry Form */}
        {showForm && (
          <Card className="bg-zinc-900/50 border-zinc-800 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                Create Memory Entry
              </CardTitle>
              <CardDescription>Add a new memory log or note</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setNewEntry({ ...newEntry, type: 'daily' })}
                  className={`flex-1 ${
                    newEntry.type === 'daily' 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-500' 
                      : 'border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Daily Log
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewEntry({ ...newEntry, type: 'note' })}
                  className={`flex-1 ${
                    newEntry.type === 'note' 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-500' 
                      : 'border-zinc-700 text-zinc-400'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Named Note
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {newEntry.type === 'daily' ? (
                  <div>
                    <label className="text-sm text-zinc-400 block mb-2">Date</label>
                    <Input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-zinc-400 block mb-2">Note Name *</label>
                    <Input
                      placeholder="e.g., project-ideas"
                      value={newEntry.title}
                      onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm text-zinc-400 block mb-2">
                    {newEntry.type === 'daily' ? 'Entry Title (optional)' : 'Section Title'}
                  </label>
                  <Input
                    placeholder={newEntry.type === 'daily' ? 'e.g., Morning standup' : 'e.g., Overview'}
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">Content *</label>
                <Textarea
                  placeholder="Write your memory entry..."
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[120px]"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={createEntry} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Entry
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700 text-zinc-300">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editor */}
        <Card className="flex-1 flex flex-col bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex-row items-center justify-between border-b border-zinc-800">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-400" />
                {selectedFile || 'MEMORY.md'}
                {hasChanges && (
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    Modified
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedFile ? 'Daily memory log' : 'Long-term curated memory'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadMemory}
                disabled={isLoading}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={saveMemory}
                disabled={isSaving || !hasChanges}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                Loading...
              </div>
            ) : (
              <Textarea
                value={selectedFile ? selectedContent : memoryMd}
                onChange={(e) => handleContentChange(e.target.value)}
                className="h-full min-h-[400px] font-mono text-sm bg-zinc-900 border-zinc-700 text-zinc-100 resize-none"
                placeholder="Memory content..."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
