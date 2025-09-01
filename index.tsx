
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// ======== From types.ts ========
enum View {
  MainMenu,
  Drawing,
  Writing,
  Gallery,
}

interface Plan {
  id: number;
  type: 'drawing' | 'text';
  content: string; // base64 for drawing, text for writing
  title: string;
  createdAt: Date;
}

// ======== From components/icons.tsx ========
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const CollectionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
    </svg>
);

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const DocumentTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);


const LightBulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

// ======== From services/geminiService.ts ========
const generateIdea = async (heritageName: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable not set");
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey });
  if (!heritageName) {
    throw new Error("Heritage name is required to generate an idea.");
  }
  const prompt = `저는 한국의 초등학교 4학년 학생입니다. 우리나라의 소중한 국가유산인 '${heritageName}'을 친구들에게 쉽고 재미있게 알리고 싶어요. 초등학생 눈높이에 맞는 홍보 아이디어 한 가지를 100자 이내로 간단하게 제안해주세요.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
          temperature: 0.8,
          topP: 1,
          topK: 32,
          maxOutputTokens: 200,
          thinkingConfig: { thinkingBudget: 100 }
      },
    });
    if (response && response.text) {
      return response.text;
    } else {
      throw new Error("No response text from Gemini API.");
    }
  } catch (error) {
    console.error("Error generating idea from Gemini API:", error);
    throw new Error("Failed to generate an idea. Please try again later.");
  }
};

// ======== From components/Header.tsx ========
interface HeaderProps {
  setView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ setView }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-amber-200">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-emerald-800">
          ✨ 나의 국가유산 홍보대사 프로젝트 ✨
        </h1>
        <p className="text-sm text-emerald-600 mt-1">
          우리의 소중한 국가유산을 멋지게 알려봐요!
        </p>
      </div>
      <nav className="mt-4 sm:mt-0">
        <button
          onClick={() => setView(View.MainMenu)}
          className="mr-2 inline-flex items-center px-4 py-2 bg-sky-500 text-white font-semibold rounded-full hover:bg-sky-600 transition-all duration-300 transform hover:scale-105 shadow-md"
        >
          <HomeIcon />
          <span className="ml-2">처음으로</span>
        </button>
        <button
          onClick={() => setView(View.Gallery)}
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-md"
        >
          <CollectionIcon />
          <span className="ml-2">우리들의 계획 보기</span>
        </button>
      </nav>
    </header>
  );
};

// ======== From components/MainMenu.tsx ========
interface MainMenuProps {
  setView: (view: View) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ setView }) => {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-emerald-700 mb-4">어떻게 홍보 계획을 세워볼까요?</h2>
      <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
        여러분이 조사한 국가유산을 사람들에게 알릴 수 있는 멋진 방법을 생각해보세요.
        그림으로 자유롭게 표현하거나, 글로 꼼꼼하게 계획을 세울 수 있어요.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div
          onClick={() => setView(View.Drawing)}
          className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-amber-200 cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
        >
          <div className="w-20 h-20 mx-auto bg-sky-100 rounded-full flex items-center justify-center mb-4">
            <PencilIcon />
          </div>
          <h3 className="text-2xl font-bold text-sky-800 mb-2">그림으로 만들기</h3>
          <p className="text-gray-600">
            상상력을 발휘하여 홍보 포스터나 안내도를 자유롭게 그려보세요!
          </p>
        </div>
        <div
          onClick={() => setView(View.Writing)}
          className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-amber-200 cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
        >
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <DocumentTextIcon />
          </div>
          <h3 className="text-2xl font-bold text-emerald-800 mb-2">글로 만들기</h3>
          <p className="text-gray-600">
            누가, 언제, 어디서, 무엇을, 어떻게 홍보할지 계획을 글로 작성해보세요.
          </p>
        </div>
      </div>
    </div>
  );
};

// ======== From components/DrawingView.tsx ========
interface DrawingViewProps {
  onSave: (plan: Omit<Plan, 'id' | 'createdAt'>) => void;
  onBack: () => void;
}

const COLORS = ["#111827", "#ef4444", "#3b82f6", "#22c55e", "#f97316", "#eab308", "#a855f7"];

const DrawingView: React.FC<DrawingViewProps> = ({ onSave, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(5);
  
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    contextRef.current = context;

    const handleResize = () => {
      const scale = window.devicePixelRatio;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      context.scale(scale, scale);
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = brushSize;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const getEventPosition = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in event.nativeEvent) {
      if (event.nativeEvent.touches.length === 0) return null;
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).nativeEvent.clientX;
      clientY = (event as React.MouseEvent).nativeEvent.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const context = contextRef.current;
    if (!context) return;
    const pos = getEventPosition(event);
    if (!pos) return;
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getEventPosition]);

  const finishDrawing = useCallback(() => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  }, []);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    if (event.cancelable) event.preventDefault();
    const pos = getEventPosition(event);
    if (!pos) return;
    contextRef.current.lineTo(pos.x, pos.y);
    contextRef.current.stroke();
  }, [isDrawing, getEventPosition]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('홍보 계획의 제목을 입력해주세요!');
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      onSave({ type: 'drawing', title, content: image });
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200">
      <h2 className="text-2xl font-bold text-center text-emerald-700 mb-4">그림으로 홍보 계획 세우기</h2>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="홍보 계획 제목 (예: 경복궁 야간개장 포스터)" className="w-full p-3 mb-4 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"/>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-auto flex md:flex-col items-center gap-4 bg-gray-100 p-4 rounded-lg">
          <div className="flex flex-row md:flex-col gap-2">
            {COLORS.map(c => (<button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} style={{backgroundColor: c}} />))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="brushSize" className="text-sm font-medium">굵기:</label>
            <input type="range" id="brushSize" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24"/>
          </div>
          <button onClick={() => setColor('#FFFFFF')} className="p-2 bg-white rounded-lg border-2 border-gray-300 hover:bg-gray-200 transition">
            <SparklesIcon /> <span className="hidden md:inline">지우개</span>
          </button>
          <button onClick={clearCanvas} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">
            <TrashIcon /> <span className="hidden md:inline">모두 지우기</span>
          </button>
        </div>
        <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseUp={finishDrawing} onMouseMove={draw} onMouseLeave={finishDrawing} onTouchStart={startDrawing} onTouchEnd={finishDrawing} onTouchMove={draw} className="w-full h-96 md:h-[500px] bg-white rounded-lg shadow-inner border-2 border-gray-200 cursor-crosshair touch-none"/>
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="flex items-center px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-all duration-300">
          <BackIcon /> <span className="ml-2">뒤로가기</span>
        </button>
        <button onClick={handleSave} className="flex items-center px-6 py-2 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all duration-300 transform hover:scale-105 shadow-md">
          <SaveIcon /> <span className="ml-2">저장하기</span>
        </button>
      </div>
    </div>
  );
};

// ======== From components/WritingView.tsx ========
interface WritingViewProps {
  onSave: (plan: Omit<Plan, 'id' | 'createdAt'>) => void;
  onBack: () => void;
}

const WritingView: React.FC<WritingViewProps> = ({ onSave, onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요!');
      return;
    }
    onSave({ type: 'text', title, content });
  };

  const handleGetIdea = async () => {
    if (!title.trim()) {
      alert('아이디어를 얻으려면 먼저 국가유산 이름을 제목에 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const idea = await generateIdea(title);
      setContent(prevContent => prevContent ? `${prevContent}\n\n[AI 추천 아이디어💡]\n${idea}` : `[AI 추천 아이디어💡]\n${idea}`);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        setError(`아이디어를 가져오는 데 실패했어요. (${e.message})`);
      } else {
        setError('아이디어를 가져오는 데 실패했어요. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-amber-200 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-emerald-700 mb-6">글로 홍보 계획 세우기</h2>
      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-lg font-semibold text-gray-700 mb-2">국가유산 이름 (제목)</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 수원 화성" className="w-full p-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"/>
        </div>
        <div>
          <label htmlFor="content" className="block text-lg font-semibold text-gray-700 mb-2">홍보 계획 내용</label>
          <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="어떻게 홍보할지 자세히 적어보세요. (예: 수원 화성 그리기 대회를 열어요!)" rows={10} className="w-full p-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"/>
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <div className="text-center">
            <button onClick={handleGetIdea} disabled={isLoading} className="inline-flex items-center px-6 py-3 bg-yellow-400 text-yellow-900 font-bold rounded-full hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed">
                <LightBulbIcon />
                <span className="ml-2">{isLoading ? '생각 중...' : 'AI에게 홍보 아이디어 얻기'}</span>
            </button>
        </div>
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="flex items-center px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-all duration-300">
          <BackIcon /> <span className="ml-2">뒤로가기</span>
        </button>
        <button onClick={handleSave} className="flex items-center px-6 py-2 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all duration-300 transform hover:scale-105 shadow-md">
          <SaveIcon /> <span className="ml-2">저장하기</span>
        </button>
      </div>
    </div>
  );
};

// ======== From components/GalleryView.tsx ========
interface GalleryViewProps {
  plans: Plan[];
}

const PlanCard: React.FC<{ plan: Plan }> = ({ plan }) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-amber-100">
        <h3 className="font-bold text-lg text-amber-900 truncate">{plan.title}</h3>
        <p className="text-xs text-gray-500">{plan.createdAt.toLocaleString('ko-KR')}</p>
      </div>
      {plan.type === 'drawing' ? (
        <div className="p-4 bg-gray-50 flex-grow">
          <img src={plan.content} alt={plan.title} className="w-full h-auto object-contain rounded-md border border-gray-200" />
        </div>
      ) : (
        <div className="p-4 flex-grow">
          <p className="text-gray-700 whitespace-pre-wrap">{plan.content}</p>
        </div>
      )}
    </div>
  );
};

const GalleryView: React.FC<GalleryViewProps> = ({ plans }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-center text-emerald-700 mb-8">✨ 우리들의 멋진 홍보 계획 ✨</h2>
      {plans.length === 0 ? (
        <div className="text-center bg-white/80 p-12 rounded-2xl shadow-md border border-amber-200">
          <p className="text-xl text-gray-600">아직 등록된 계획이 없어요.</p>
          <p className="mt-2 text-gray-500">첫 번째 홍보 계획을 만들어보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
};

// ======== From App.tsx ========
const App: React.FC = () => {
  const [view, setView] = useState<View>(View.MainMenu);
  const [plans, setPlans] = useState<Plan[]>([]);

  const addPlan = useCallback((plan: Omit<Plan, 'id' | 'createdAt'>) => {
    const newPlan: Plan = {
      ...plan,
      id: Date.now(),
      createdAt: new Date(),
    };
    setPlans(prevPlans => [newPlan, ...prevPlans]);
    setView(View.Gallery);
  }, []);

  const renderView = () => {
    switch (view) {
      case View.Drawing:
        return <DrawingView onSave={addPlan} onBack={() => setView(View.MainMenu)} />;
      case View.Writing:
        return <WritingView onSave={addPlan} onBack={() => setView(View.MainMenu)} />;
      case View.Gallery:
        return <GalleryView plans={plans} />;
      case View.MainMenu:
      default:
        return <MainMenu setView={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      <div 
        className="absolute top-0 left-0 w-full h-full bg-repeat bg-center opacity-50" 
        style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}>
      </div>
      <div className="relative container mx-auto px-4 py-8">
        <Header setView={setView} />
        <main className="mt-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

// ======== From original index.tsx ========
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
