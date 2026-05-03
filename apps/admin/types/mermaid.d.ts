declare module 'mermaid' {
  export interface MermaidApi {
    contentLoaded: () => void;
  }

  const mermaid: MermaidApi;
  export default mermaid;
}
