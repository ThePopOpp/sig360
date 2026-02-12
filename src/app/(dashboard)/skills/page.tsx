'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wrench, Package, FileText, RefreshCw, Plus, X, Upload, Trash2, ExternalLink } from "lucide-react";

interface Skill {
  name: string;
  description: string;
  location: string;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [toolsContent, setToolsContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    content: ''
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/skills');
      const data = await response.json();
      setSkills(data.skills || []);
      setToolsContent(data.tools || '');
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setNewSkill({ ...newSkill, content });
      };
      reader.readAsText(file);
    }
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) return;
    
    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add',
          skill: {
            name: newSkill.name,
            description: newSkill.description,
            content: newSkill.content
          }
        }),
      });
      
      setNewSkill({ name: '', description: '', content: '' });
      setUploadedFile(null);
      setShowForm(false);
      loadSkills();
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const saveTools = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveTools', content: toolsContent }),
      });
    } catch (error) {
      console.error('Error saving TOOLS.md:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" />
            Skills & Tools
          </h1>
          <p className="text-zinc-400">Installed skills and tool configuration</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadSkills}
            disabled={isLoading}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add Skill'}
          </Button>
        </div>
      </div>

      {/* Add Skill Form */}
      {showForm && (
        <Card className="mb-6 bg-zinc-900/50 border-zinc-800 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              Add New Skill
            </CardTitle>
            <CardDescription>Create a custom skill or upload a SKILL.md file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Skill Name *</label>
                <Input
                  placeholder="e.g., my-custom-skill"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Upload SKILL.md</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".md,.markdown"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadedFile ? uploadedFile.name : 'Choose File'}
                  </Button>
                  {uploadedFile && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadedFile(null);
                        setNewSkill({ ...newSkill, content: '' });
                      }}
                      className="border-zinc-700 text-zinc-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Description</label>
              <Input
                placeholder="What does this skill do?"
                value={newSkill.description}
                onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 block mb-2">
                Skill Content (SKILL.md)
                {uploadedFile && <span className="text-orange-500 ml-2">— Loaded from file</span>}
              </label>
              <Textarea
                placeholder="# Skill Name&#10;&#10;Instructions for how to use this skill..."
                value={newSkill.content}
                onChange={(e) => setNewSkill({ ...newSkill, content: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={addSkill} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Skill
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700 text-zinc-300">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-zinc-400" />
          Installed Skills
        </h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-zinc-500">Loading...</div>
        ) : skills.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-8 text-center text-zinc-500">
              No skills installed. Add one above or install from ClawdHub.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <Card key={skill.name} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{skill.name}</CardTitle>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>{skill.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs text-zinc-500 break-all block p-2 bg-zinc-800 rounded">
                    {skill.location}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex justify-center">
          <a
            href="https://clawdhub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400"
          >
            <ExternalLink className="w-4 h-4" />
            Browse more skills on ClawdHub
          </a>
        </div>
      </div>

      {/* TOOLS.md */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-400" />
            TOOLS.md
          </h2>
          <Button
            onClick={saveTools}
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <Textarea
              value={toolsContent}
              onChange={(e) => setToolsContent(e.target.value)}
              placeholder="# TOOLS.md - Local Notes&#10;&#10;Add your tool-specific notes here..."
              className="min-h-[300px] font-mono text-sm bg-zinc-900 border-zinc-700 text-zinc-100"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
