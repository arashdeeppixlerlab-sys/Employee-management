import { supabase } from '../services/supabase/supabaseClient';
import { Profile } from '../types/auth';

export interface Employee extends Profile {
  name?: string; // Optional name field if it exists in the database
}

export class EmployeeService {
  static async fetchEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Employee fetch error:', error);
        return [];
      }

      return data as Employee[] || [];
    } catch (error) {
      console.error('Employee fetch exception:', error);
      return [];
    }
  }

  static async fetchEmployeeById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Employee fetch error:', error);
        return null;
      }

      return data as Employee | null;
    } catch (error) {
      console.error('Employee fetch exception:', error);
      return null;
    }
  }
}
