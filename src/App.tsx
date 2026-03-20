/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { Question, Game, Player } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Play, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LogOut, 
  Settings, 
  ArrowRight,
  Leaf,
  Award,
  BarChart3
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const variants = {
    primary: 'bg-green-500 text-white hover:bg-green-600 shadow-md',
    secondary: 'bg-white text-green-600 border-2 border-green-500 hover:bg-green-50 shadow-sm',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl shadow-xl p-6 border border-green-50', className)}>
    {children}
  </div>
);

// --- Sounds ---
const playSound = (type: 'correct' | 'wrong' | 'countdown' | 'finish') => {
  const sounds = {
    correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    countdown: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
    finish: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.play().catch(() => {}); // Ignore autoplay blocks
};

// --- Sub-Views (Moved outside to prevent re-renders) ---

const HomeView = ({ setView }: { setView: (v: any) => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 bg-gradient-to-br from-green-50 to-emerald-100">
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="text-center"
    >
      <div className="flex items-center justify-center mb-4">
        <div className="bg-green-500 p-4 rounded-3xl shadow-lg">
          <Leaf className="w-12 h-12 text-white" />
        </div>
      </div>
      <h1 className="text-5xl font-black text-green-800 mb-2">Green Game</h1>
      <p className="text-green-600 font-medium">El quiz de la sostenibilidad</p>
    </motion.div>

    <div className="flex flex-col w-full max-w-xs gap-4">
      <Button onClick={() => setView('player-join')} className="py-6 text-xl">
        ¡Jugar ahora!
      </Button>
      <Button onClick={() => setView('admin-login')} variant="secondary">
        Soy Administrador
      </Button>
    </div>
  </div>
);

const AdminLoginView = ({ 
  handleAdminLogin, 
  setView 
}: { 
  handleAdminLogin: (code: string) => void; 
  setView: (v: any) => void;
}) => {
  const [code, setCode] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAdminLogin(code);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-green-50">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-green-800 mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6" /> Acceso Admin
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de Acceso</label>
            <input 
              type="password" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 border-2 border-green-100 rounded-xl focus:border-green-500 outline-none transition-all"
              placeholder="Ingresa el código..."
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full">Entrar</Button>
          <Button onClick={() => setView('home')} variant="ghost" className="w-full">Volver</Button>
        </form>
      </Card>
    </div>
  );
};

const AdminDashboard = ({ 
  questions, 
  createGame, 
  setView 
}: { 
  questions: Question[]; 
  createGame: () => void; 
  setView: (v: any) => void;
}) => {
  const [newQ, setNewQ] = useState<Partial<Question>>({
    text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A'
  });

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.text || !newQ.optionA || !newQ.optionB) return;
    await addDoc(collection(db, 'questions'), newQ);
    setNewQ({ text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A' });
  };

  const deleteQuestion = async (id: string) => {
    if (window.confirm('¿Borrar esta pregunta?')) {
      await deleteDoc(doc(db, 'questions', id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-green-800">Panel de Control</h1>
            <p className="text-gray-500">Gestiona tus preguntas y juegos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={createGame} variant="success">
              <Play className="w-5 h-5" /> Crear Partida
            </Button>
            <Button onClick={() => setView('home')} variant="ghost">
              <LogOut className="w-5 h-5" /> Salir
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Nueva Pregunta
              </h2>
              <form onSubmit={addQuestion} className="space-y-3">
                <textarea 
                  placeholder="Pregunta..." 
                  value={newQ.text}
                  onChange={e => setNewQ({...newQ, text: e.target.value})}
                  className="w-full p-3 border rounded-xl h-24"
                />
                <input placeholder="Opción A" value={newQ.optionA} onChange={e => setNewQ({...newQ, optionA: e.target.value})} className="w-full p-2 border rounded-lg" />
                <input placeholder="Opción B" value={newQ.optionB} onChange={e => setNewQ({...newQ, optionB: e.target.value})} className="w-full p-2 border rounded-lg" />
                <input placeholder="Opción C" value={newQ.optionC} onChange={e => setNewQ({...newQ, optionC: e.target.value})} className="w-full p-2 border rounded-lg" />
                <input placeholder="Opción D" value={newQ.optionD} onChange={e => setNewQ({...newQ, optionD: e.target.value})} className="w-full p-2 border rounded-lg" />
                <select 
                  value={newQ.correctOption} 
                  onChange={e => setNewQ({...newQ, correctOption: e.target.value as any})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="A">Correcta: A</option>
                  <option value="B">Correcta: B</option>
                  <option value="C">Correcta: C</option>
                  <option value="D">Correcta: D</option>
                </select>
                <Button type="submit" className="w-full">Guardar Pregunta</Button>
              </form>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Banco de Preguntas ({questions.length})
            </h2>
            {questions.map(q => (
              <div key={q.id}>
                <Card className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg mb-2">{q.text}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={cn('p-1 px-2 rounded', q.correctOption === 'A' ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50')}>A: {q.optionA}</div>
                      <div className={cn('p-1 px-2 rounded', q.correctOption === 'B' ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50')}>B: {q.optionB}</div>
                      <div className={cn('p-1 px-2 rounded', q.correctOption === 'C' ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50')}>C: {q.optionC}</div>
                      <div className={cn('p-1 px-2 rounded', q.correctOption === 'D' ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50')}>D: {q.optionD}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600 p-2">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerJoinView = ({ 
  joinGame, 
  setView 
}: { 
  joinGame: (name: string, code: string) => void; 
  setView: (v: any) => void;
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinGame(name, code);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-green-500 to-emerald-600">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl">
          <h2 className="text-3xl font-black text-center text-green-800 mb-8">Unirse al Juego</h2>
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">Tu Nombre</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl text-xl font-bold focus:border-green-500 outline-none"
                placeholder="Ej: EcoGuerrero"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">Código del PIN</label>
              <input 
                required
                type="text" 
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl text-4xl font-black text-center tracking-[1rem] focus:border-green-500 outline-none"
                placeholder="0000"
              />
            </div>
            <Button type="submit" className="w-full py-6 text-2xl">¡ENTRAR!</Button>
            <Button onClick={() => setView('home')} variant="ghost" className="w-full">Cancelar</Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const LobbyView = React.memo(({ 
  currentGame, 
  allPlayers, 
  isAdmin, 
  startGame 
}: { 
  currentGame: Game | null; 
  allPlayers: Player[]; 
  isAdmin: boolean; 
  startGame: () => void;
}) => (
  <div className="min-h-screen bg-green-500 flex flex-col items-center p-6 text-white">
    <div className="w-full max-w-4xl flex flex-col items-center gap-8">
      <div className="text-center mt-12">
        <p className="text-xl font-bold opacity-80 mb-2">PIN DEL JUEGO:</p>
        <h1 className="text-8xl font-black tracking-widest bg-white text-green-600 px-8 py-4 rounded-3xl shadow-2xl">
          {currentGame?.code}
        </h1>
      </div>

      <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-8 min-h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Jugadores ({allPlayers.length})
          </h2>
          {isAdmin && (
            <Button onClick={startGame} variant="success" className="bg-white text-green-600 hover:bg-green-50 border-none">
              <Play className="w-5 h-5" /> Empezar Juego
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <AnimatePresence initial={false}>
            {allPlayers.map((p) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                layout
                className="bg-white text-green-800 px-6 py-3 rounded-2xl font-black text-xl shadow-lg"
              >
                {p.name}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {allPlayers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Clock className="w-12 h-12 mb-4 animate-pulse" />
            <p className="text-xl font-medium">Esperando a que se unan...</p>
          </div>
        )}
      </div>

      {!isAdmin && (
        <p className="text-xl font-bold animate-bounce">
          ¡Prepárate! El administrador iniciará pronto...
        </p>
      )}
    </div>
  </div>
));

const TimerDisplay = React.memo(({ timeLeft }: { timeLeft: number }) => (
  <div className="bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-xl">
    {timeLeft}
  </div>
));

const GameView = React.memo(({ 
  currentQuestion, 
  currentGame, 
  timeLeft, 
  currentPlayer, 
  hasAnswered, 
  lastAnswerCorrect, 
  showCorrectAnswer, 
  submitAnswer, 
  isAdmin, 
  nextQuestion 
}: { 
  currentQuestion: Question | null; 
  currentGame: Game | null; 
  timeLeft: number; 
  currentPlayer: Player | null; 
  hasAnswered: boolean; 
  lastAnswerCorrect: boolean | null; 
  showCorrectAnswer: boolean; 
  submitAnswer: (opt: any) => void; 
  isAdmin: boolean; 
  nextQuestion: () => void;
}) => {
  if (!currentQuestion) return null;

  const options = [
    { id: 'A', text: currentQuestion.optionA, color: 'bg-red-500' },
    { id: 'B', text: currentQuestion.optionB, color: 'bg-blue-500' },
    { id: 'C', text: currentQuestion.optionC, color: 'bg-yellow-500' },
    { id: 'D', text: currentQuestion.optionD, color: 'bg-green-500' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <TimerDisplay timeLeft={timeLeft} />
          <p className="font-bold text-gray-600">Pregunta {currentGame!.currentQuestionIndex + 1} de {currentGame!.questionIds.length}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase">Puntuación</p>
          <p className="text-2xl font-black text-green-600">{currentPlayer?.score || 0}</p>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.h2 
          key={currentQuestion.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl md:text-5xl font-black text-gray-800 max-w-4xl"
        >
          {currentQuestion.text}
        </motion.h2>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-8">
        {options.map((opt) => {
          const isCorrect = opt.id === currentQuestion.correctOption;
          
          return (
            <motion.button
              key={opt.id}
              whileHover={{ scale: hasAnswered || showCorrectAnswer ? 1 : 1.02 }}
              whileTap={{ scale: hasAnswered || showCorrectAnswer ? 1 : 0.98 }}
              onClick={() => submitAnswer(opt.id as any)}
              disabled={hasAnswered || showCorrectAnswer}
              className={cn(
                'relative p-6 md:p-10 rounded-2xl text-white text-xl md:text-2xl font-bold shadow-lg transition-all text-left flex items-center gap-4',
                opt.color,
                hasAnswered && !showCorrectAnswer && 'opacity-50 grayscale-[0.5]',
                showCorrectAnswer && !isCorrect && 'opacity-20',
                showCorrectAnswer && isCorrect && 'ring-8 ring-green-300 scale-105 z-10'
              )}
            >
              <span className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                {opt.id}
              </span>
              {opt.text}
              {showCorrectAnswer && isCorrect && (
                <CheckCircle2 className="absolute right-6 w-10 h-10" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {hasAnswered && !showCorrectAnswer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white p-8 rounded-3xl text-center shadow-2xl">
              <Clock className="w-16 h-16 text-green-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-2xl font-black text-gray-800">¡Respuesta enviada!</h3>
              <p className="text-gray-500">Espera a que termine el tiempo...</p>
            </div>
          </motion.div>
        )}

        {showCorrectAnswer && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white p-6 shadow-2xl border-t-4 border-green-500 flex flex-col md:flex-row items-center justify-between gap-4 z-50"
          >
            <div className="flex items-center gap-4">
              {lastAnswerCorrect ? (
                <div className="bg-green-100 p-3 rounded-full"><CheckCircle2 className="w-8 h-8 text-green-600" /></div>
              ) : (
                <div className="bg-red-100 p-3 rounded-full"><XCircle className="w-8 h-8 text-red-600" /></div>
              )}
              <div>
                <h4 className="text-xl font-black">{lastAnswerCorrect ? '¡Excelente!' : '¡Oh no!'}</h4>
                <p className="text-gray-500">{lastAnswerCorrect ? 'Has ganado puntos por rapidez.' : 'La respuesta correcta era ' + currentQuestion.correctOption}</p>
              </div>
            </div>
            
            {isAdmin && (
              <Button onClick={nextQuestion} variant="primary" className="w-full md:w-auto px-12 py-4 text-xl">
                {currentGame!.currentQuestionIndex + 1 === currentGame!.questionIds.length ? 'Ver Resultados' : 'Siguiente Pregunta'} <ArrowRight />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const ResultsView = ({ 
  allPlayers, 
  currentPlayer, 
  isAdmin 
}: { 
  allPlayers: Player[]; 
  currentPlayer: Player | null; 
  isAdmin: boolean;
}) => {
  const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);
  const myRank = sortedPlayers.findIndex(p => p.id === currentPlayer?.id) + 1;
  const top3 = sortedPlayers.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 to-emerald-800 p-6 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-5xl font-black mb-2">¡Fin del Juego!</h1>
          <p className="text-xl opacity-80">Increíble participación de todos</p>
        </div>

        {/* Podium */}
        <div className="flex justify-center items-end gap-2 md:gap-4 mb-16 h-64">
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div 
              initial={{ height: 0 }} animate={{ height: '60%' }}
              className="bg-white/20 backdrop-blur-md w-24 md:w-32 rounded-t-2xl flex flex-col items-center justify-end p-4 relative"
            >
              <div className="absolute -top-12 text-center">
                <div className="bg-gray-300 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700 mx-auto mb-1">2</div>
                <p className="font-bold truncate w-24">{top3[1].name}</p>
              </div>
              <p className="font-black text-xl">{top3[1].score}</p>
            </motion.div>
          )}
          {/* 1st Place */}
          {top3[0] && (
            <motion.div 
              initial={{ height: 0 }} animate={{ height: '85%' }}
              className="bg-yellow-400 w-28 md:w-40 rounded-t-2xl flex flex-col items-center justify-end p-4 relative"
            >
              <div className="absolute -top-16 text-center">
                <Award className="w-12 h-12 text-yellow-200 mx-auto mb-1" />
                <p className="font-black text-xl text-yellow-900 truncate w-28">{top3[0].name}</p>
              </div>
              <p className="font-black text-2xl text-yellow-900">{top3[0].score}</p>
            </motion.div>
          )}
          {/* 3rd Place */}
          {top3[2] && (
            <motion.div 
              initial={{ height: 0 }} animate={{ height: '40%' }}
              className="bg-white/10 backdrop-blur-md w-24 md:w-32 rounded-t-2xl flex flex-col items-center justify-end p-4 relative"
            >
              <div className="absolute -top-12 text-center">
                <div className="bg-orange-400 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mx-auto mb-1">3</div>
                <p className="font-bold truncate w-24">{top3[2].name}</p>
              </div>
              <p className="font-black text-xl">{top3[2].score}</p>
            </motion.div>
          )}
        </div>

        {/* My Result (for players) */}
        {!isAdmin && currentPlayer && (
          <Card className="mb-8 bg-white text-green-800">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase">Tu Posición</p>
                <h3 className="text-4xl font-black">#{myRank}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-400 uppercase">Tu Puntuación</p>
                <h3 className="text-4xl font-black text-green-600">{currentPlayer.score}</h3>
              </div>
            </div>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card className="bg-white/10 backdrop-blur-md border-none text-white">
          <h3 className="text-2xl font-bold mb-6">Clasificación Completa</h3>
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={cn(
                "flex justify-between items-center p-4 rounded-xl",
                p.id === currentPlayer?.id ? "bg-white/20 border-2 border-white" : "bg-black/10"
              )}>
                <div className="flex items-center gap-4">
                  <span className="font-black text-xl opacity-50 w-6">{i + 1}</span>
                  <span className="font-bold text-lg">{p.name}</span>
                </div>
                <span className="font-black text-xl">{p.score}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-12 flex justify-center">
          <Button onClick={() => window.location.reload()} variant="secondary" className="px-12">
            Volver al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'home' | 'admin-login' | 'admin' | 'player-join' | 'lobby' | 'game' | 'results'>('home');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Real-time Listeners ---

  useEffect(() => {
    // Listen for questions
    const q = query(collection(db, 'questions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(qs);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentGame?.id) return;

    // Listen for game state
    const unsubscribeGame = onSnapshot(doc(db, 'games', currentGame.id), (docSnap) => {
      if (docSnap.exists()) {
        const gameData = { id: docSnap.id, ...docSnap.data() } as Game;
        setCurrentGame(gameData);
        
        // Handle view transitions based on game status
        if (gameData.status === 'playing') {
          setView('game');
        } else if (gameData.status === 'finished') {
          setView('results');
        }
      }
    });

    // Listen for players in this game
    const qPlayers = query(collection(db, 'players'), where('gameId', '==', currentGame.id));
    const unsubscribePlayers = onSnapshot(qPlayers, (snapshot) => {
      const ps = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Player));
      setAllPlayers(ps.sort((a, b) => b.score - a.score));
      
      // Update current player state if it exists
      if (currentPlayer) {
        const updatedMe = ps.find(p => p.id === currentPlayer.id);
        if (updatedMe) setCurrentPlayer(updatedMe);
      }
    });

    return () => {
      unsubscribeGame();
      unsubscribePlayers();
    };
  }, [currentGame?.id, currentPlayer?.id]);

  // Handle question index changes
  useEffect(() => {
    if (currentGame?.status === 'playing' && questions.length > 0) {
      const qId = currentGame.questionIds[currentGame.currentQuestionIndex];
      const q = questions.find(q => q.id === qId);
      if (q) {
        setCurrentQuestion(q);
        setTimeLeft(15);
        setHasAnswered(false);
        setLastAnswerCorrect(null);
        setShowCorrectAnswer(false);
      }
    }
  }, [currentGame?.currentQuestionIndex, currentGame?.status, questions]);

  // Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'game' && timeLeft > 0 && !showCorrectAnswer) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setShowCorrectAnswer(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, timeLeft, showCorrectAnswer]);

  // --- Actions ---

  const handleAdminLogin = (code: string) => {
    if (code === 'Green2026') {
      setIsAdmin(true);
      setView('admin');
    } else {
      alert('Código incorrecto');
    }
  };

  const createGame = async () => {
    if (questions.length === 0) {
      alert('Crea algunas preguntas primero');
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const newGame = {
      code,
      status: 'waiting',
      currentQuestionIndex: 0,
      questionIds: questions.map(q => q.id),
      startTime: Date.now()
    };
    const docRef = await addDoc(collection(db, 'games'), newGame);
    setCurrentGame({ id: docRef.id, ...newGame } as Game);
    setView('lobby');
  };

  const joinGame = async (name: string, code: string) => {
    const q = query(collection(db, 'games'), where('code', '==', code), where('status', '==', 'waiting'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      alert('Juego no encontrado o ya iniciado');
      return;
    }
    const gameDoc = snapshot.docs[0];
    const gameData = { id: gameDoc.id, ...gameDoc.data() } as Game;
    
    const newPlayer = {
      gameId: gameData.id,
      name: name,
      score: 0
    };
    const playerRef = await addDoc(collection(db, 'players'), newPlayer);
    setCurrentPlayer({ id: playerRef.id, ...newPlayer } as Player);
    setCurrentGame(gameData);
    setView('lobby');
  };

  const startGame = async () => {
    if (!currentGame) return;
    await updateDoc(doc(db, 'games', currentGame.id), { 
      status: 'playing',
      startTime: Date.now()
    });
  };

  const submitAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (hasAnswered || !currentQuestion || !currentPlayer || !currentGame) return;
    
    const isCorrect = option === currentQuestion.correctOption;
    const responseTime = 15 - timeLeft;
    const points = isCorrect ? Math.round(1000 * (1 - responseTime / 30)) : 0;
    
    setHasAnswered(true);
    setLastAnswerCorrect(isCorrect);
    if (isCorrect) playSound('correct');
    else playSound('wrong');

    // Update player score
    await updateDoc(doc(db, 'players', currentPlayer.id), {
      score: currentPlayer.score + points
    });

    // Save answer
    await addDoc(collection(db, 'answers'), {
      playerId: currentPlayer.id,
      gameId: currentGame.id,
      questionId: currentQuestion.id,
      selectedOption: option,
      isCorrect,
      responseTime
    });
  };

  const nextQuestion = async () => {
    if (!currentGame) return;
    const nextIndex = currentGame.currentQuestionIndex + 1;
    if (nextIndex >= currentGame.questionIds.length) {
      await updateDoc(doc(db, 'games', currentGame.id), { status: 'finished' });
      playSound('finish');
    } else {
      await updateDoc(doc(db, 'games', currentGame.id), { 
        currentQuestionIndex: nextIndex,
        startTime: Date.now()
      });
    }
  };

  // --- Router ---

  return (
    <div className="font-sans antialiased text-gray-900">
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HomeView setView={setView} />
          </motion.div>
        )}
        {view === 'admin-login' && (
          <motion.div key="admin-login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminLoginView 
              handleAdminLogin={handleAdminLogin} 
              setView={setView} 
            />
          </motion.div>
        )}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminDashboard questions={questions} createGame={createGame} setView={setView} />
          </motion.div>
        )}
        {view === 'player-join' && (
          <motion.div key="player-join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PlayerJoinView 
              joinGame={joinGame} 
              setView={setView} 
            />
          </motion.div>
        )}
        {view === 'lobby' && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LobbyView currentGame={currentGame} allPlayers={allPlayers} isAdmin={isAdmin} startGame={startGame} />
          </motion.div>
        )}
        {view === 'game' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameView 
              currentQuestion={currentQuestion}
              currentGame={currentGame}
              timeLeft={timeLeft}
              currentPlayer={currentPlayer}
              hasAnswered={hasAnswered}
              lastAnswerCorrect={lastAnswerCorrect}
              showCorrectAnswer={showCorrectAnswer}
              submitAnswer={submitAnswer}
              isAdmin={isAdmin}
              nextQuestion={nextQuestion}
            />
          </motion.div>
        )}
        {view === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultsView allPlayers={allPlayers} currentPlayer={currentPlayer} isAdmin={isAdmin} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
