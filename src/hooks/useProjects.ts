import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Project, ProjectCategory, ProjectStatus } from '../types';

/** Jointure créateur ; nom de contrainte FK par défaut PostgreSQL. */
const PROJECT_WITH_CREATOR =
  '*, creator:profiles!projects_created_by_fkey(id, full_name, email)';

export type NewProjectInput = {
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  scale: string;
  cycle: string;
  client_contact: string;
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_WITH_CREATOR)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (e) {
      console.error('fetchProjects', e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (userId: string, input: NewProjectInput) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...input,
        created_by: userId,
      })
      .select(PROJECT_WITH_CREATOR)
      .single();
    if (error) return { error, data: null };
    if (data == null) {
      return { error: null, data: null };
    }
    const row = data as Project;
    setProjects(prev => [row, ...prev]);
    return { error: null, data: row };
  }, []);

  const updateProjectStatus = useCallback(async (id: string, status: ProjectStatus) => {
    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)
      .select(PROJECT_WITH_CREATOR)
      .single();
    if (error) return { error };
    const row = data as Project;
    setProjects(prev => prev.map(p => (p.id === id ? row : p)));
    return { error: null };
  }, []);

  const updateProject = useCallback(async (id: string, input: NewProjectInput) => {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: input.name,
        category: input.category,
        status: input.status,
        scale: input.scale,
        cycle: input.cycle,
        client_contact: input.client_contact,
      })
      .eq('id', id)
      .select(PROJECT_WITH_CREATOR)
      .single();
    if (error) return { error, data: null };
    if (data == null) return { error: null, data: null };
    const row = data as Project;
    setProjects(prev => prev.map(p => (p.id === id ? row : p)));
    return { error: null, data: row };
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return { error };
    setProjects(prev => prev.filter(p => p.id !== id));
    return { error: null };
  }, []);

  return {
    projects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
  };
};
