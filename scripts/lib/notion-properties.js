/**
 * Extrae valores legibles de page.properties (respuesta Notion API).
 */
function getTitle(props, key = "Name") {
  const p = props[key];
  if (!p || p.type !== "title") {
    return "";
  }
  return (p.title || []).map((t) => t.plain_text).join("").trim();
}

function getRichText(props, key) {
  const p = props[key];
  if (!p || p.type !== "rich_text") {
    return "";
  }
  return (p.rich_text || []).map((t) => t.plain_text).join("").trim();
}

function getSelect(props, key) {
  const p = props[key];
  if (!p) {
    return "";
  }
  if (p.type === "select") {
    return p.select?.name || "";
  }
  if (p.type === "status") {
    return p.status?.name || "";
  }
  return "";
}

function getUrl(props, key) {
  const p = props[key];
  if (!p || p.type !== "url") {
    return "";
  }
  return p.url || "";
}

function getCheckbox(props, key) {
  const p = props[key];
  if (!p || p.type !== "checkbox") {
    return false;
  }
  return Boolean(p.checkbox);
}

module.exports = {
  getTitle,
  getRichText,
  getSelect,
  getUrl,
  getCheckbox,
};
