import { jsonOk, serverErrorLogged, tryRoute } from '../../../../../lib/api-response';
import { readCatalog } from '../../../../../lib/services/icso-catalog.service';

export async function GET(): Promise<Response> {
  return tryRoute('GET /api/icso/catalog/public', async () => {
    try {
      const { catalog } = readCatalog();
      return jsonOk({ catalog });
    } catch (err) {
      return serverErrorLogged('GET /api/icso/catalog/public:', err);
    }
  });
}
