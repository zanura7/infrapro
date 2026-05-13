'use client';

import { useState, useRef } from 'react';
import {
  generateStrategy,
  generateImageFromImage,
  generateVideoFromImage,
  type ContentStrategy,
} from '@/lib/ai';
import {
  Upload, Image as ImageIcon, Video, Loader2, Sparkles, AlertCircle,
  Download, FileText, Check, Brain, Target, Megaphone, RefreshCw,
  CheckCircle2, ChevronRight, RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';

type Step =
  | 'upload'
  | 'analyzing'
  | 'strategy'
  | 'generating-image'
  | 'image-review'
  | 'generating-video'
  | 'done';

const STRATEGY_MODELS = [
  { id: 'grok-4.20-beta',   label: 'Grok 4.20 Beta',   vendor: 'vision · recommended' },
  { id: 'grok-4.1-expert',  label: 'Grok 4.1 Expert',  vendor: 'deep reasoning' },
  { id: 'grok-4.1-fast',    label: 'Grok 4.1 Fast',    vendor: 'quick · cheap' },
];

export default function App() {
  // --- inputs ---
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [language, setLanguage] = useState<'indonesian' | 'malay' | 'english'>('indonesian');
  const [productContext, setProductContext] = useState('');
  const [strategyModel, setStrategyModel] = useState(STRATEGY_MODELS[0].id);

  // --- pipeline state ---
  const [step, setStep] = useState<Step>('upload');
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // Handlers
  // ============================================================
  const resetAll = () => {
    setStrategy(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setError(null);
    setStep(image ? 'upload' : 'upload');
  };

  const onFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    resetAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelected(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  };

  // 1. Analyze image → strategy JSON
  const runAnalysis = async () => {
    if (!image || !imagePreview) return;
    setStep('analyzing');
    setError(null);
    try {
      const base64Data = imagePreview.split(',')[1];
      const s = await generateStrategy({
        imageBase64: base64Data,
        mimeType: image.type,
        language,
        productContext,
        model: strategyModel,
      });
      setStrategy(s);
      setStep('strategy');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image.');
      setStep('upload');
    }
  };

  // 2. Generate image from strategy.image_prompt
  const runImageGen = async (regenerate = false) => {
    if (!image || !imagePreview || !strategy) return;
    setStep('generating-image');
    setError(null);
    if (regenerate) setGeneratedImage(null);
    try {
      const base64Data = imagePreview.split(',')[1];
      const url = await generateImageFromImage({
        imageBase64: base64Data,
        mimeType: image.type,
        prompt: strategy.image_prompt,
        aspectRatio: strategy.format.aspect_ratio || '9:16',
      });
      setGeneratedImage(url);
      setStep('image-review');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate image.');
      setStep('strategy');
    }
  };

  // 3. User approves → generate video from the approved image
  const runVideoGen = async () => {
    if (!generatedImage || !strategy) return;
    setStep('generating-video');
    setError(null);

    try {
      // The approved image is the new reference for image-to-video
      const { base64, mime } = await fetchAsBase64(generatedImage);
      const videoUrl = await generateVideoFromImage({
        imageBase64: base64,
        mimeType: mime,
        prompt: strategy.video_prompt,
        aspectRatio: strategy.format.aspect_ratio || '9:16',
        videoLength: 8,
        resolution: '480p',
        preset: 'normal',
      });
      setGeneratedVideo(videoUrl);
      setStep('done');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate video.');
      setStep('image-review');
    }
  };

  // helper: convert a data: URL or http URL to {base64, mime}
  async function fetchAsBase64(src: string): Promise<{ base64: string; mime: string }> {
    if (src.startsWith('data:')) {
      const m = src.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error('Bad data URL.');
      return { mime: m[1], base64: m[2] };
    }
    const res = await fetch(src);
    const blob = await res.blob();
    const mime = blob.type || 'image/png';
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve((r.result as string).split(',')[1] || '');
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return { base64, mime };
  }

  // ============================================================
  // UI
  // ============================================================
  const stepIndex = stepToIndex(step);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 grid place-items-center shadow-lg shadow-indigo-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">AI Content Studio</h1>
                <p className="text-sm text-slate-500">Image → strategy → image → video. AI-driven, approve at each step.</p>
              </div>
            </div>
            {(strategy || generatedImage || generatedVideo) && (
              <button
                onClick={() => {
                  setImage(null); setImagePreview(null);
                  resetAll();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Start over
              </button>
            )}
          </div>

          {/* Stepper */}
          <div className="mt-8 flex items-center gap-3 text-sm">
            <StepPill index={1} current={stepIndex} label="Upload"   icon={Upload} />
            <Connector active={stepIndex >= 2} />
            <StepPill index={2} current={stepIndex} label="Analyze"  icon={Brain} />
            <Connector active={stepIndex >= 3} />
            <StepPill index={3} current={stepIndex} label="Image"    icon={ImageIcon} />
            <Connector active={stepIndex >= 4} />
            <StepPill index={4} current={stepIndex} label="Approve"  icon={Check} />
            <Connector active={stepIndex >= 5} />
            <StepPill index={5} current={stepIndex} label="Video"    icon={Video} />
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 whitespace-pre-wrap">{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ============ LEFT: Inputs ============ */}
          <aside className="lg:col-span-4 space-y-5">

            {/* Upload */}
            <Card title="Product Image" icon={ImageIcon}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`
                  relative group cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all
                  ${imagePreview
                    ? 'border-indigo-200 bg-indigo-50/30'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
                `}
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                {imagePreview ? (
                  <div className="relative aspect-[3/4] max-h-[300px] mx-auto overflow-hidden rounded-lg shadow-md">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-medium flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Change image
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-6">
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-base font-medium">Upload product image</p>
                      <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP · drop or click</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Settings */}
            <Card title="Strategy Settings" icon={Target}>
              <div className="space-y-5">
                {/* Model picker */}
                <div>
                  <label className="text-xs font-medium text-slate-700">Strategy model</label>
                  <p className="text-[11px] text-slate-500 mb-2">Which LLM analyzes the image and picks the angle.</p>
                  <div className="space-y-1.5">
                    {STRATEGY_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setStrategyModel(m.id)}
                        className={`
                          w-full px-3 py-2 rounded-lg text-sm text-left transition-all flex items-center justify-between
                          ${strategyModel === m.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}
                        `}
                      >
                        <span>
                          <span className="font-medium">{m.label}</span>
                          <span className={`ml-2 text-[10px] ${strategyModel === m.id ? 'text-indigo-200' : 'text-slate-400'}`}>{m.vendor}</span>
                        </span>
                        {strategyModel === m.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs font-medium text-slate-700">Output language</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {([
                      { id: 'indonesian', label: '🇮🇩 ID' },
                      { id: 'malay',      label: '🇲🇾 MY' },
                      { id: 'english',    label: '🇬🇧 EN' },
                    ] as const).map(l => (
                      <button
                        key={l.id}
                        onClick={() => setLanguage(l.id)}
                        className={`
                          px-2 py-2 rounded-lg text-sm font-medium transition-all
                          ${language === l.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}
                        `}
                      >{l.label}</button>
                    ))}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <label className="text-xs font-medium text-slate-700">Product context <span className="text-slate-400">(optional)</span></label>
                  <textarea
                    value={productContext}
                    onChange={e => setProductContext(e.target.value)}
                    rows={3}
                    placeholder="USP, target audience hints, brand voice..."
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* Primary CTA — analyze */}
            <button
              onClick={runAnalysis}
              disabled={!image || step === 'analyzing'}
              className={`
                w-full py-3.5 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2 text-sm
                ${!image || step === 'analyzing'
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5'}
              `}
            >
              {step === 'analyzing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing image…</>
              ) : strategy ? (
                <><RefreshCw className="w-4 h-4" /> Re-analyze</>
              ) : (
                <><Brain className="w-4 h-4" /> Analyze image</>
              )}
            </button>
          </aside>

          {/* ============ RIGHT: Pipeline ============ */}
          <main className="lg:col-span-8 space-y-5">

            {/* No state */}
            {step === 'upload' && !strategy && (
              <EmptyState />
            )}

            {/* Analyzing */}
            {step === 'analyzing' && (
              <LoadingCard
                title="Analyzing image…"
                subtitle={`${STRATEGY_MODELS.find(m => m.id === strategyModel)?.label || 'AI'} is identifying the product, audience, and best creative angle.`}
              />
            )}

            {/* Strategy result */}
            {strategy && step !== 'analyzing' && (
              <StrategyCard
                strategy={strategy}
                modelLabel={STRATEGY_MODELS.find(m => m.id === strategyModel)?.label || 'AI'}
                generatingImage={step === 'generating-image'}
                hasImage={!!generatedImage}
                onGenerate={() => runImageGen(false)}
              />
            )}

            {/* Generating image */}
            {step === 'generating-image' && (
              <LoadingCard
                title="Generating image…"
                subtitle="Compositing product reference with the chosen strategy prompt."
              />
            )}

            {/* Image review */}
            {generatedImage && (step === 'image-review' || step === 'generating-video' || step === 'done') && (
              <ImageReviewCard
                imageUrl={generatedImage}
                aspectRatio={strategy?.format.aspect_ratio || '9:16'}
                onRegenerate={() => runImageGen(true)}
                onApprove={runVideoGen}
                isRegenerating={step === 'generating-image'}
                videoStarted={step === 'generating-video' || step === 'done'}
              />
            )}

            {/* Generating video */}
            {step === 'generating-video' && (
              <LoadingCard
                title="Rendering 8-second video…"
                subtitle="Image-to-video can take 1–3 minutes. You can leave this page open."
                long
              />
            )}

            {/* Final video */}
            {generatedVideo && step === 'done' && (
              <VideoResultCard
                videoUrl={generatedVideo}
                aspectRatio={strategy?.format.aspect_ratio || '9:16'}
                onRegenerate={runVideoGen}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function stepToIndex(s: Step): number {
  switch (s) {
    case 'upload':            return 1;
    case 'analyzing':         return 2;
    case 'strategy':          return 3;
    case 'generating-image':  return 3;
    case 'image-review':      return 4;
    case 'generating-video':  return 5;
    case 'done':              return 5;
  }
}

function StepPill({ index, current, label, icon: Icon }: { index: number; current: number; label: string; icon: any }) {
  const done   = current > index;
  const active = current === index;
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      ${done   ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
        active ? 'bg-indigo-600 text-white shadow-sm' :
                 'bg-slate-100 text-slate-500'}
    `}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return <div className={`h-px flex-1 ${active ? 'bg-emerald-300' : 'bg-slate-200'}`} />;
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-600" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center p-12 min-h-[500px]">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
        <Sparkles className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold">Upload a product image to start.</h3>
      <p className="max-w-md mt-2 text-sm text-slate-500">
        The AI will inspect the photo, decide the best angle and format, generate an ad image,
        and (once you approve it) turn it into a short video.
      </p>
      <div className="mt-8 grid grid-cols-5 gap-2 text-[11px] text-slate-500 max-w-md">
        {['Upload','Analyze','Image','Approve','Video'].map((s, i) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-slate-400 text-xs font-mono">{i+1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingCard({ title, subtitle, long }: { title: string; subtitle: string; long?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-start gap-5">
      <div className="w-12 h-12 rounded-full bg-indigo-50 grid place-items-center shrink-0">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-slate-500 mt-1">{subtitle}</div>
        {long && (
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function StrategyCard({
  strategy, modelLabel, generatingImage, hasImage, onGenerate,
}: {
  strategy: ContentStrategy;
  modelLabel: string;
  generatingImage: boolean;
  hasImage: boolean;
  onGenerate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold">Strategy</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{modelLabel}</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-400">Step 2 of 5</span>
      </div>

      <div className="p-6 space-y-6">
        {/* Product analysis */}
        <Section label="Product">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="text-lg font-semibold">{strategy.product.name}</div>
            <div className="text-xs text-slate-500">{strategy.product.category}</div>
          </div>
          <p className="text-sm text-slate-600 mt-1">{strategy.product.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strategy.product.key_features.map(f => (
              <span key={f} className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700">{f}</span>
            ))}
          </div>
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section label="Audience">
            <div className="text-sm font-medium">{strategy.audience.primary}</div>
            <p className="text-xs text-slate-500 mt-1">{strategy.audience.psychographics}</p>
            <ul className="mt-2 space-y-1">
              {strategy.audience.pain_points.map(p => (
                <li key={p} className="text-xs text-slate-600 flex gap-2">
                  <span className="text-indigo-500">·</span>{p}
                </li>
              ))}
            </ul>
          </Section>

          <Section label="Angle">
            <div className="inline-block px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold uppercase tracking-wide">{strategy.strategy.angle}</div>
            <p className="text-xs text-slate-600 mt-2">{strategy.strategy.rationale}</p>
          </Section>

          <Section label="Format">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold">{strategy.format.type.replace(/_/g,' ')}</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">{strategy.format.aspect_ratio}</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">{strategy.format.rationale}</p>
          </Section>

          <Section label="Hook + CTA">
            <div className="font-serif italic text-base text-slate-800">"{strategy.hook}"</div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Megaphone className="w-3.5 h-3.5" /> {strategy.cta}
            </div>
          </Section>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
            View raw image &amp; video prompts
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Image prompt</div>
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">{strategy.image_prompt}</pre>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Video prompt</div>
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">{strategy.video_prompt}</pre>
            </div>
          </div>
        </details>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div className="text-xs text-slate-500">Happy with this direction? Generate the image.</div>
        <button
          onClick={onGenerate}
          disabled={generatingImage}
          className={`
            px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
            ${generatingImage
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : hasImage
                ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow shadow-indigo-200'}
          `}
        >
          {generatingImage
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : hasImage
              ? <><RefreshCw className="w-4 h-4" /> Regenerate image</>
              : <><Sparkles className="w-4 h-4" /> Generate image</>}
        </button>
      </div>
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold mb-2">{label}</div>
      {children}
    </div>
  );
}

function ImageReviewCard({
  imageUrl, aspectRatio, onRegenerate, onApprove, isRegenerating, videoStarted,
}: {
  imageUrl: string;
  aspectRatio: string;
  onRegenerate: () => void;
  onApprove: () => void;
  isRegenerating: boolean;
  videoStarted: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold">Image · review &amp; approve</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">{aspectRatio}</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-400">Step 3–4 of 5</span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ aspectRatio: aspectRatio.replace(':','/') }}>
          <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Does this image work?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Approving it kicks off image-to-video. You can still regenerate before approving — each retry costs another image credit.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
                ${isRegenerating
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}
              `}
            >
              {isRegenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</>
                : <><RefreshCw className="w-4 h-4" /> Regenerate image</>}
            </button>

            <a
              href={imageUrl}
              download={`approved-image.png`}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Download className="w-4 h-4" /> Download
            </a>

            <button
              onClick={onApprove}
              disabled={videoStarted}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
                ${videoStarted
                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow shadow-emerald-200'}
              `}
            >
              {videoStarted
                ? <><CheckCircle2 className="w-4 h-4" /> Approved · generating video</>
                : <><Check className="w-4 h-4" /> Approve &amp; generate video</>}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VideoResultCard({
  videoUrl, aspectRatio, onRegenerate,
}: {
  videoUrl: string;
  aspectRatio: string;
  onRegenerate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold">Video · ready</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">DONE</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-400">Step 5 of 5</span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        <div className="bg-black rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ aspectRatio: aspectRatio.replace(':','/') }}>
          <video src={videoUrl} controls playsInline className="w-full h-full object-cover" />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Your clip is ready.</h3>
            <p className="text-sm text-slate-500 mt-1">Download it, post it, or re-render with a tweak.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={videoUrl}
              download={`scene.mp4`}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow shadow-indigo-200 transition-all"
            >
              <Download className="w-4 h-4" /> Download MP4
            </a>
            <button
              onClick={onRegenerate}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Regenerate video
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
