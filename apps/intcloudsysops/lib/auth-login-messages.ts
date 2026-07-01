export function authFetchErrorMessage(): string {
  return 'El acceso al panel no está configurado correctamente en este despliegue. Usa "¿Olvidaste tu contraseña?" o avisa al equipo.';
}

export function isAuthFetchError(message: string): boolean {
  return message.toLowerCase().includes('fetch');
}
