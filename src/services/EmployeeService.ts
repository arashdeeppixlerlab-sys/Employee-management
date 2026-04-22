import { supabase } from '../services/supabase/supabaseClient';
import { Profile } from '../types/auth';

export interface Employee extends Profile {
}

export class EmployeeService {
  static async fetchEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .is('deleted_at', null)
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
