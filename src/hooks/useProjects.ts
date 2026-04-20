import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Project, ProjectCategory, ProjectStatus } from '../types';

/** Jointure créateur ; nom de contrainte FK par défaut PostgreSQL. */
export const PROJECT_WITH_CREATOR =
  '*, creator:profiles!projects_created_by_fkey(id, full_name, email)';

export type NewProjectInput = {
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  scale: string;
  cycle: string;
  client_contact: string;
  /** Saisi Sales (popup) ; omis = ne pas modifier en update. */
  contract_amount?: number | null;
};

export type ProjectFinanceFields = {
  contract_amount: number | null;
  payment_terms: string;
  cost_labor: number | null;
  cost_rent: number | null;
  cost_materials: number | null;
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
    const { contract_amount, ...rest } = input;
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...rest,
        ...(contract_amount != null ? { contract_amount } : {}),
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

  const updateProjectStatusAndContractAmount = useCallback(
    async (id: string, status: ProjectStatus, contractAmount: number) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ status, contract_amount: contractAmount })
        .eq('id', id)
        .select(PROJECT_WITH_CREATOR)
        .single();
      if (error) return { error };
      const row = data as Project;
      setProjects(prev => prev.map(p => (p.id === id ? row : p)));
      return { error: null };
    },
    []
  );

  const updateProjectFinanceFields = useCallback(async (id: string, fields: ProjectFinanceFields) => {
    const { data, error } = await supabase
      .from('projects')
      .update({
        contract_amount: fields.contract_amount,
        payment_terms: fields.payment_terms,
        cost_labor: fields.cost_labor,
        cost_rent: fields.cost_rent,
        cost_materials: fields.cost_materials,
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

  const updateProject = useCallback(async (id: string, input: NewProjectInput) => {
    const { contract_amount, ...base } = input;
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: base.name,
        category: base.category,
        status: base.status,
        scale: base.scale,
        cycle: base.cycle,
        client_contact: base.client_contact,
        ...(contract_amount !== undefined ? { contract_amount } : {}),
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
    updateProjectStatusAndContractAmount,
    updateProjectFinanceFields,
    deleteProject,
  };
};
