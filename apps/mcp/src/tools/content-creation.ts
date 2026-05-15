import type { ToolDefinition, ToolContext } from '../types/index.js';

const SSH_KEY = '~/.ssh/vps_to_opsly_admin';
const OPSLY_QUANTUM = 'dragon@100.89.38.3';

async function runSshCommand(command: string): Promise<string> {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    exec(
      `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -i ${SSH_KEY} ${OPSLY_QUANTUM} "${command.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 60000 },
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout || stderr);
      }
    );
  });
}

export const contentCreationTools: ToolDefinition<unknown, unknown>[] = [
  // ==================== NAVEGACIÓN WEB ====================
  {
    name: 'web_navigate',
    description: 'Navega a una URL y obtiene el contenido',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL a navegar' },
        action: {
          type: 'string',
          description: 'Acción: screenshot, content, title, links',
          enum: ['screenshot', 'content', 'title', 'links'],
        },
      },
      required: ['url'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { url, action } = input as { url: string; action?: string };
      try {
        if (action === 'screenshot') {
          await runSshCommand(`osascript -e 'tell app "Google Chrome" to activate' && sleep 1`);
          await runSshCommand(`screencapture -x ~/Desktop/screenshot_$(date +%Y%m%d_%H%M%S).png`);
          return { success: true, message: 'Screenshot tomado en desktop' };
        }

        // Usar curl para obtener contenido
        const cmd =
          action === 'links'
            ? `curl -sL "${url}" | grep -oP 'href="[^"]*"' | head -20`
            : `curl -sL "${url}" | head -100`;

        const result = await runSshCommand(cmd);
        return { url, action: action || 'content', result };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'web_search',
    description: 'Busca en la web desde opsly-quantum',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta de búsqueda' },
        engine: {
          type: 'string',
          description: 'Motor de búsqueda',
          enum: ['google', 'duckduckgo', 'bing'],
        },
      },
      required: ['query'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { query, engine } = input as { query: string; engine?: string };
      try {
        const searchUrl =
          engine === 'duckduckgo'
            ? `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
            : engine === 'bing'
              ? `https://www.bing.com/search?q=${encodeURIComponent(query)}`
              : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        const result = await runSshCommand(
          `curl -sL "${searchUrl}" | grep -oP 'href="[^"]*"' | head -30`
        );
        return { query, results: result };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },

  // ==================== DOCUMENTOS ====================
  {
    name: 'doc_create_notion',
    description: 'Crea una página en Notion',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título de la página' },
        content: { type: 'string', description: 'Contenido (markdown)' },
        parent_id: { type: 'string', description: 'ID de la página padre (opcional)' },
      },
      required: ['title'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { title, content, parent_id } = input as {
        title: string;
        content?: string;
        parent_id?: string;
      };
      try {
        // Usar API de Notion (requiere token en env)
        const cmd = `curl -s -X POST https://api.notion.com/v1/pages \
          -H "Authorization: Bearer $NOTION_TOKEN" \
          -H "Content-Type: application/json" \
          -H "Notion-Version: 2022-06-28" \
          -d '{"parent":{"page_id":"'"${parent_id || 'root'}"'"},"properties":{"title":{"title":[{"text":{"content":"'"${title}"'"}}]}},"content":{"rich_text":[{"text":{"content":"'"${content || ''}"'"}}]}}}'`;

        const result = await runSshCommand(cmd);
        return { success: true, title, result: JSON.parse(result) };
      } catch (error) {
        return { error: String(error), hint: 'Configura NOTION_TOKEN en opsly-quantum' };
      }
    },
  },
  {
    name: 'doc_create_obsidian',
    description: 'Crea una nota en Obsidian (vault por defecto)',
    inputSchema: {
      type: 'object',
      properties: {
        vault: { type: 'string', description: 'Nombre del vault (default: default)' },
        filename: { type: 'string', description: 'Nombre del archivo sin extensión' },
        content: { type: 'string', description: 'Contenido markdown' },
        folder: { type: 'string', description: 'Carpeta dentro del vault' },
      },
      required: ['filename', 'content'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { vault, filename, content, folder } = input as {
        vault?: string;
        filename: string;
        content: string;
        folder?: string;
      };
      try {
        const vaultPath = vault || 'Obsidian';
        const folderPath = folder ? `/${folder}` : '';
        const cmd = `mkdir -p ~/Library/Application\\ Support/${vaultPath}/vault${folderPath} && echo '${content.replace(/'/g, "'\\''")}' > ~/Library/Application\\ Support/${vaultPath}/vault${folderPath}/${filename}.md`;

        await runSshCommand(cmd);
        return {
          success: true,
          filename: `${filename}.md`,
          path: `${vaultPath}/vault${folderPath}/${filename}.md`,
        };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'doc_export_pdf',
    description: 'Exporta un documento a PDF desde Chrome/Preview',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL a convertir' },
        output_name: { type: 'string', description: 'Nombre del archivo PDF' },
      },
      required: ['url'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { url, output_name } = input as { url: string; output_name?: string };
      try {
        const name = output_name || `doc_$(date +%Y%m%d_%H%M%S)`;
        // Usar Chrome para imprimir a PDF
        const cmd = `open -a "Google Chrome" "${url}" && sleep 3 && osascript -e 'tell app "Google Chrome" to print front window with properties {as PDF, shrink to page:false}'`;

        await runSshCommand(cmd);
        return { success: true, message: `PDF iniciado: ${name}.pdf` };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },

  // ==================== GRABACIÓN / CAPTURA ====================
  {
    name: 'capture_screenshot',
    description: 'Captura de pantalla en opsly-quantum',
    inputSchema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          description: 'Área de captura',
          enum: ['full', 'window', 'selection'],
        },
        save_path: { type: 'string', description: 'Ruta donde guardar (default: Desktop)' },
      },
      required: ['area'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { area, save_path } = input as { area: string; save_path?: string };
      try {
        let cmd = '';
        const timestamp = '$(date +%Y%m%d_%H%M%S)';
        const path = save_path || '~/Desktop';

        if (area === 'full') {
          cmd = `screencapture -x ${path}/screenshot_${timestamp}.png`;
        } else if (area === 'window') {
          cmd = `screencapture -W -x ${path}/window_${timestamp}.png`;
        } else {
          cmd = `screencapture -s -x ${path}/selection_${timestamp}.png`;
        }

        await runSshCommand(cmd);
        return { success: true, area, saved_to: save_path || 'Desktop' };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'capture_screen_record',
    description: 'Inicia/detiene grabación de pantalla (OBS)',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Acción a realizar',
          enum: ['start', 'stop', 'status'],
        },
        output_path: { type: 'string', description: 'Ruta de salida del video' },
      },
      required: ['action'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { action, output_path } = input as { action: string; output_path?: string };
      try {
        if (action === 'start') {
          // Iniciar grabación con OBS CLI o screencapture
          const path = output_path || '~/Desktop/recording_$(date +%Y%m%d_%H%M%S).mov';
          await runSshCommand(`open -a OBS && sleep 2`);
          return { success: true, message: 'OBS abierto - iniciar grabación manualmente' };
        } else if (action === 'stop') {
          await runSshCommand(
            'osascript -e "tell app \"System Events\" to keystroke \"r\" using {command down, shift down}"'
          );
          return { success: true, message: 'Grabación detenida' };
        } else {
          const result = await runSshCommand('ps aux | grep -i obs | grep -v grep');
          return { status: result.includes('OBS') ? 'recording' : 'idle' };
        }
      } catch (error) {
        return { error: String(error) };
      }
    },
  },

  // ==================== GENERACIÓN DE IMÁGENES ====================
  {
    name: 'image_generate',
    description: 'Genera una imagen usando DALL-E o OpenAI',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descripción de la imagen a generar' },
        size: {
          type: 'string',
          description: 'Tamaño de imagen',
          enum: ['1024x1024', '1792x1024', '1024x1792'],
        },
        model: {
          type: 'string',
          description: 'Modelo a usar',
          enum: ['dall-e-3', 'dall-e-2'],
        },
      },
      required: ['prompt'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { prompt, size, model } = input as { prompt: string; size?: string; model?: string };
      try {
        // Requires OPENAI_API_KEY in environment
        const cmd = `curl -s -X POST https://api.openai.com/v1/images/generations \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $OPENAI_API_KEY" \
          -d '{"prompt":"'"${prompt}"'","size":"'"${size || '1024x1024'}"'","n":1,"model":"'"${model || 'dall-e-3'}"'"}'`;

        const result = await runSshCommand(cmd);
        const parsed = JSON.parse(result);
        const imageUrl = parsed.data?.[0]?.url;
        return {
          success: true,
          image_url: imageUrl,
          prompt,
          model: model || 'dall-e-3',
        };
      } catch (error) {
        return { error: String(error), hint: 'Configura OPENAI_API_KEY en opsly-quantum' };
      }
    },
  },
  {
    name: 'image_generate_local',
    description: 'Genera imagen local con Ollama (stable-diffusion)',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descripción de la imagen' },
        model: { type: 'string', description: 'Modelo (default: stable-diffusion)' },
      },
      required: ['prompt'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { prompt, model } = input as { prompt: string; model?: string };
      try {
        // Ollama debe tener modelo de imágenes instalado
        const modelName = model || 'stable-diffusion';
        const cmd = `curl -s http://localhost:11434/api/generate -d '{"model":"${modelName}","prompt":"${prompt}","stream":false}'`;
        const result = await runSshCommand(cmd);
        return { success: true, prompt, model: model || 'stable-diffusion', result };
      } catch (error) {
        return {
          error: String(error),
          hint: 'Instala modelo de imágenes en Ollama: ollama pull stable-diffusion',
        };
      }
    },
  },

  // ==================== VIDEO / AUDIO ====================
  {
    name: 'video_edit_capcut',
    description: 'Abre CapCut para edición de video',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Acción',
          enum: ['open', 'new_project', 'export'],
        },
        project_name: { type: 'string', description: 'Nombre del proyecto' },
      },
      required: ['action'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { action, project_name } = input as { action: string; project_name?: string };
      try {
        if (action === 'open') {
          await runSshCommand('open -a CapCut');
          return { success: true, message: 'CapCut abierto' };
        } else if (action === 'new_project') {
          await runSshCommand('open -a CapCut');
          return {
            success: true,
            message: 'CapCut abierto - crear proyecto manualmente',
            project: project_name,
          };
        }
        return { message: 'Acción no implementada' };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'audio_edit_ableton',
    description: 'Controla Ableton Live para producción de audio',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Acción',
          enum: ['open', 'new_set', 'export'],
        },
        project_path: { type: 'string', description: 'Ruta del proyecto' },
      },
      required: ['action'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { action, project_path } = input as { action: string; project_path?: string };
      try {
        if (action === 'open') {
          await runSshCommand('open -a "Ableton Live 12 Trial"');
          return { success: true, message: 'Ableton Live abierto' };
        }
        return { message: 'Acción: open, new_set, export' };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },

  // ==================== CREACIÓN AUTOMÁTICA ====================
  {
    name: 'content_blog_post',
    description: 'Crea un blog post automático (markdown + imágenes)',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título del post' },
        topic: { type: 'string', description: 'Tema o descripción' },
        publish_to: {
          type: 'string',
          description: 'Dónde publicar',
          enum: ['notion', 'obsidian', 'file'],
        },
      },
      required: ['title', 'topic'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { title, topic, publish_to } = input as {
        title: string;
        topic: string;
        publish_to?: string;
      };
      try {
        // Crear contenido markdown
        const content = `# ${title}\n\n**Fecha:** $(date +%Y-%m-%d)\n\n## Introducción\n\n${topic}\n\n## Desarrollo\n\n[Contenido generado automáticamente]\n\n## Conclusión\n\n[Conclusión del tema]\n`;

        if (publish_to === 'obsidian') {
          await runSshCommand(
            `echo '${content}' > ~/Library/Application\\ Support/Obsidian/vault/blog/${title.replace(/ /g, '_')}.md`
          );
          return { success: true, title, location: 'Obsidian/vault/blog/' };
        }

        // Guardar como archivo
        await runSshCommand(
          `mkdir -p ~/Desktop/blog && echo '${content}' > ~/Desktop/blog/${title.replace(/ /g, '_')}.md`
        );
        return { success: true, title, saved_to: '~/Desktop/blog/' };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
  {
    name: 'content_presentation',
    description: 'Crea una presentación (Keynote/PowerPoint)',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título de presentación' },
        slides: { type: 'number', description: 'Número de slides (default: 5)' },
        content: { type: 'string', description: 'Tema o contenido' },
      },
      required: ['title'],
    },
    handler: async (input: unknown, _context?: ToolContext) => {
      const { title, slides, content } = input as {
        title: string;
        slides?: number;
        content?: string;
      };
      try {
        // Crear presentación usando AppleScript o archivo
        const numSlides = slides || 5;
        let slideContent = '';
        for (let i = 1; i <= numSlides; i++) {
          slideContent += `Slide ${i}: ${content || 'Contenido'}\n`;
        }

        // Guardar como markdown (puede convertirse después)
        await runSshCommand(
          `mkdir -p ~/Desktop/presentations && echo "# ${title}\n\n${slideContent}" > ~/Desktop/presentations/${title.replace(/ /g, '_')}.md`
        );

        return {
          success: true,
          title,
          slides: numSlides,
          message: 'Presentación creada como markdown. Abre en Keynote/PP para editar.',
          saved_to: '~/Desktop/presentations/',
        };
      } catch (error) {
        return { error: String(error) };
      }
    },
  },
];
