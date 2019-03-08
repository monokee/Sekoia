
// Registered UI Components
const CUE_UI_MODULES = new Map();

const SYNTHETIC_EVENT_KEYS = new Map();

const CUE_TREEWALKER = DOC.createTreeWalker(DOC, NodeFilter.SHOW_ALL, null, false);

const CUE_REF_ID = '$';

const TAGNAME_TEMPLATE = 'TEMPLATE';