import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

// Use local worker via Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const TOOLS = { NONE: 'none', PEN: 'pen', HIGHLIGHTER: 'highlighter', ERASER: 'eraser' };
const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

export default function ViewerPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [title, setTitle] = useState('');
  const [zoom, setZoom] = useState(1.0);
  const [tool, setTool] = useState(TOOLS.NONE);
  const [penColor, setPenColor] = useState('#1B5E20');
  const [penWidth, setPenWidth] = useState(3);
  const [highlightColor, setHighlightColor] = useState('#FFD700');
  const [pageInputVal, setPageInputVal] = useState('1');

  // ── CONTENT PROTECTION ─────────────────────────────────────────────────────
  useEffect(() => {
    const preventContextMenu = e => e.preventDefault();
    const preventKeys = e => {
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeys);
    };
  }, []);

  // ── LOAD PDF via Axios then pass as ArrayBuffer to PDF.js ─────────────────
  const loadPdf = useCallback(async (arrayBuffer) => {
    const uint8Array = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    pdfDocRef.current = pdf;
    return pdf;
  }, []);

  const fetchPdf = useCallback(async () => {
    const metaRes = await api.get(`/content/${id}/view/meta`);
    const pdfRes = await api.get(`/content/${id}/view`, {
      responseType: 'arraybuffer',
      headers: { Accept: 'application/pdf' }
    });
    // Ensure we have a proper ArrayBuffer
    let buffer = pdfRes.data;
    if (!(buffer instanceof ArrayBuffer)) {
      buffer = new Uint8Array(buffer).buffer;
    }
    return { meta: metaRes.data, buffer };
  }, [id]);

  const renderPage = useCallback(async (num) => {
    if (!pdfDocRef.current) return;
    const page = await pdfDocRef.current.getPage(num);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewport = page.getViewport({ scale: zoom });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Clear annotation canvas on page change
    const aCanvas = annotationCanvasRef.current;
    if (aCanvas) {
      aCanvas.width = viewport.width;
      aCanvas.height = viewport.height;
      const aCtx = aCanvas.getContext('2d');
      aCtx.clearRect(0, 0, aCanvas.width, aCanvas.height);
    }

    // Update progress
    try {
      const viewed = JSON.parse(sessionStorage.getItem(`progress-${id}`) || '[]');
      if (!viewed.includes(num)) viewed.push(num);
      sessionStorage.setItem(`progress-${id}`, JSON.stringify(viewed));
      await api.patch(`/progress/${id}`, {
        lastPageViewed: num,
        pagesViewed: viewed,
        pageCount: pdfDocRef.current.numPages,
      });
    } catch {}
  }, [zoom, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { meta, buffer } = await fetchPdf();
        setTitle(meta.title);
        const pdf = await loadPdf(buffer);
        // Use PDF.js page count as source of truth
        const pc = pdf.numPages || meta.pageCount || 0;
        setPageCount(pc);
        if (!cancelled) { await renderPage(1); setLoading(false); }

        // Stream URL is stable — no refresh needed
      } catch (err) {
        if (!cancelled) { setError('Unable to load this content.'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; clearInterval(refreshIntervalRef.current); };
  }, [id]);

  useEffect(() => { if (!loading) renderPage(pageNum); }, [pageNum, zoom]);

  // ── NAVIGATION ─────────────────────────────────────────────────────────────
  const goTo = n => {
    const clamped = Math.max(1, Math.min(pageCount, n));
    setPageNum(clamped);
    setPageInputVal(String(clamped));
  };

  // ── ANNOTATION ─────────────────────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = e => {
    if (tool === TOOLS.NONE) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const canvas = annotationCanvasRef.current;
    const pos = getPos(e, canvas);
    lastPointRef.current = pos;

    if (tool === TOOLS.ERASER) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(pos.x - 15, pos.y - 15, 30, 30);
    }
  };

  const draw = e => {
    if (!isDrawingRef.current || tool === TOOLS.NONE) return;
    e.preventDefault();
    const canvas = annotationCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    if (tool === TOOLS.ERASER) {
      ctx.clearRect(pos.x - 15, pos.y - 15, 30, 30);
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(pos.x, pos.y);

      if (tool === TOOLS.PEN) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      } else if (tool === TOOLS.HIGHLIGHTER) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 20;
        ctx.lineCap = 'square';
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    lastPointRef.current = pos;
  };

  const endDraw = () => { isDrawingRef.current = false; };

  const clearAnnotations = () => {
    const canvas = annotationCanvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const cursor = { [TOOLS.NONE]: 'default', [TOOLS.PEN]: 'crosshair', [TOOLS.HIGHLIGHTER]: 'crosshair', [TOOLS.ERASER]: 'cell' };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">← Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 viewer-container" onContextMenu={e => e.preventDefault()}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">← Back</button>
          <span className="font-semibold text-sm truncate max-w-xs">{title}</span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => goTo(pageNum - 1)} disabled={pageNum <= 1} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30">◀</button>
          <div className="flex items-center gap-1">
            <input
              type="number" min={1} max={pageCount}
              value={pageInputVal}
              onChange={e => setPageInputVal(e.target.value)}
              onBlur={() => goTo(parseInt(pageInputVal) || 1)}
              onKeyDown={e => e.key === 'Enter' && goTo(parseInt(pageInputVal) || 1)}
              className="w-12 bg-gray-700 text-white text-center rounded px-1 py-0.5 text-sm border border-gray-600"
            />
            <span className="text-gray-400">/ {pageCount}</span>
          </div>
          <button onClick={() => goTo(pageNum + 1)} disabled={pageNum >= pageCount} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30">▶</button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 rounded hover:bg-gray-700">−</button>
          <span className="text-gray-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded hover:bg-gray-700">+</button>
        </div>
      </div>

      {/* ── ANNOTATION TOOLBAR ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-gray-700 px-4 py-1.5 flex-shrink-0 flex-wrap">
        {[
          { t: TOOLS.NONE, label: '✋', title: 'Select' },
          { t: TOOLS.PEN, label: '✏️', title: 'Pen' },
          { t: TOOLS.HIGHLIGHTER, label: '🖊', title: 'Highlighter' },
          { t: TOOLS.ERASER, label: '⬜', title: 'Eraser' },
        ].map(({ t, label, title: tTitle }) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            title={tTitle}
            className={`px-3 py-1 rounded text-sm transition-colors ${tool === t ? 'bg-primary-700 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
          >
            {label} {tTitle}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-500 mx-1" />

        {/* Pen settings */}
        {tool === TOOLS.PEN && (
          <>
            {['#1B5E20','#B71C1C','#0D47A1','#000000','#FF6B6B','#4ECDC4'].map(c => (
              <button key={c} onClick={() => setPenColor(c)} title={c}
                className={`w-5 h-5 rounded-full border-2 ${penColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
            <input type="range" min={1} max={10} value={penWidth} onChange={e => setPenWidth(+e.target.value)}
              className="w-20 accent-primary-500" title="Pen width" />
          </>
        )}

        {/* Highlighter settings */}
        {tool === TOOLS.HIGHLIGHTER && (
          COLORS.map(c => (
            <button key={c} onClick={() => setHighlightColor(c)} title={c}
              className={`w-5 h-5 rounded border-2 ${highlightColor === c ? 'border-white' : 'border-transparent'}`}
              style={{ background: c, opacity: 0.7 }} />
          ))
        )}

        <div className="w-px h-5 bg-gray-500 mx-1" />
        <button onClick={clearAnnotations} className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-gray-600" title="Clear all annotations on this page">
          Clear Page
        </button>

        <div className="ml-auto text-xs text-gray-500">
          Annotations are not saved
        </div>
      </div>

      {/* ── CANVAS AREA ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-6 px-4 bg-gray-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-tamil text-lg">ஏற்றுகிறது...</p>
            <p className="text-sm">Loading document…</p>
          </div>
        ) : (
          <div className="relative shadow-2xl" style={{ cursor: cursor[tool] }}>
            {/* Watermark overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-5">
              <span className="text-white text-6xl font-bold rotate-[-30deg] select-none">{user?.email}</span>
            </div>
            {/* PDF canvas */}
            <canvas ref={canvasRef} className="block" />
            {/* Annotation canvas */}
            <canvas
              ref={annotationCanvasRef}
              className="absolute inset-0 z-20"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              style={{ cursor: cursor[tool] }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
