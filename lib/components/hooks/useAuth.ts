import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user
    setLoading(false);
  }, []);

  return { user, loading };
}
