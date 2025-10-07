
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { FullProjectState, BackupRecord } from '../types';

let supabase: SupabaseClient | null = null;
let supabaseUrlCache: string | null = null;

export const getSupabaseClient = (url: string, anonKey: string): SupabaseClient => {
    if (!supabase || supabaseUrlCache !== url) {
        supabase = createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });
        supabaseUrlCache = url;
    }
    return supabase;
};

export const getSession = async (client: SupabaseClient): Promise<Session | null> => {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
        console.error('Error getting Supabase session:', error.message);
        return null;
    }
    return session;
};

export const signIn = async (client: SupabaseClient, email: string, password: string): Promise<User | null> => {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
        console.error('Supabase sign-in error:', error.message);
        throw error;
    }
    return data.user;
};

export const signOut = async (client: SupabaseClient): Promise<void> => {
    const { error } = await client.auth.signOut();
    if (error) {
        console.error('Supabase sign-out error:', error.message);
        throw error;
    }
}

export const backupProject = async (client: SupabaseClient, projectData: FullProjectState): Promise<BackupRecord> => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("User not authenticated for backup.");

    const { data, error } = await client
        .from('project_backups')
        .insert({
            user_id: user.id,
            backup_data: projectData,
        })
        .select('id, created_at')
        .single();
    
    if (error) {
        console.error('Supabase backup error:', error);
        throw error;
    }

    return data as BackupRecord;
};

export const getBackups = async (client: SupabaseClient): Promise<BackupRecord[]> => {
    const { data, error } = await client
        .from('project_backups')
        .select('id, created_at, client_name')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase fetch backups error:', error);
        throw error;
    }

    return data as BackupRecord[];
};

export const getBackupData = async (client: SupabaseClient, backupId: string): Promise<FullProjectState> => {
    const { data, error } = await client
        .from('project_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

    if (error) {
        console.error('Supabase get backup data error:', error);
        throw error;
    }

    return data.backup_data as FullProjectState;
};