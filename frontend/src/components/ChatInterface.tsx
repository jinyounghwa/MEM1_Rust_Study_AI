'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import LoadingSpinner from './LoadingSpinner';
import { api, ChatMessage } from '@/lib/api';

export default function ChatInterface() {
  const [userId] = useState(() => `user-${Date.now()}`);
  const [topics, setTopics] = useState<string[]>(['']);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tip, setTip] = useState('');
  const [stepCount, setStepCount] = useState(0);
  const [progress, setProgress] = useState<any>(null);
  const [rolePlayMode, setRolePlayMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addTopic = () => {
    if (topics.length < 5) {
      setTopics([...topics, '']);
    }
  };

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  };

  const updateTopic = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const handleStart = async () => {
    const validTopics = topics.filter((t) => t.trim());
    if (validTopics.length === 0) {
      alert('최소 1개 이상의 주제를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const topicsParam = validTopics.length === 1 ? validTopics[0] : validTopics;
      const result = await api.startLearning(userId, topicsParam);
      setStarted(true);
      setMessages([]);

      // 첫 번째 주제의 설명을 메시지로 표시
      if (result.explanation) {
        setMessages([
          {
            role: 'assistant',
            content: result.explanation,
          },
        ]);
      }

      setTip(result.instruction);

      if (result.isMultiObjective) {
        setProgress({
          currentTopic: validTopics[0],
          currentIndex: 0,
          totalTopics: validTopics.length,
          completedTopics: [],
        });
      }
    } catch (error) {
      alert('학습 시작 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);
    setTip('');

    try {
      const response = await api.sendMessage(userId, message);

      setMessages((prev) => [...prev, { role: 'assistant', content: response.response }]);
      setTip(response.tip);
      setStepCount(response.currentStep);

      if (response.progress) {
        setProgress(response.progress);
      }
    } catch (error) {
      alert('메시지 전송 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextTopic = async () => {
    if (!progress) return;

    setLoading(true);
    try {
      const result = await api.nextTopic(userId);
      if (result.success) {
        setProgress(result.progress);

        // 새 주제의 설명을 메시지에 추가
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // 주제 전환 메시지
        messages.push({
          role: 'assistant',
          content: result.message,
        });

        // 주제 간 연결고리 설명
        if (result.transitionTip) {
          messages.push({
            role: 'assistant',
            content: `**📌 주제 간 연결고리:**\n\n${result.transitionTip}`,
          });
        }

        // 새 주제의 상세한 설명
        if (result.explanation) {
          messages.push({
            role: 'assistant',
            content: result.explanation,
          });
        }

        setMessages((prev) => [...prev, ...messages]);
        setTip('새로운 주제의 설명을 읽고 <IS>태그로 요약해주세요! 😊');
      }
    } catch (error) {
      alert('주제 변경 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRolePlay = async () => {
    setLoading(true);
    try {
      const result = await api.toggleRolePlay(userId);
      setRolePlayMode(result.rolePlayMode);

      // 모드 변경 안내 메시지
      const modeMessage = result.rolePlayMode
        ? '🎭 역할극 모드가 활성화되었습니다! "어떻게 사용해?" 같은 질문을 하면 실제 개발 상황 시나리오를 보여드립니다.'
        : '📚 일반 학습 모드로 변경되었습니다.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: modeMessage,
        },
      ]);
    } catch (error) {
      alert('역할극 모드 변경 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    setTimeout(() => {
      window.location.href = api.getExportUrl(userId);
      setTimeout(() => setExporting(false), 1000);
    }, 500);
  };

  if (exporting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="마크다운 파일을 생성하는 중입니다..." />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            🦀 RustLearn-MEM1
          </h1>
          <p className="text-gray-600 mb-6 text-center text-sm">
            MEM1 방식으로 Rust를 효율적으로 학습하세요
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  학습 주제를 입력하세요{' '}
                  {topics.length > 1 && `(Multi-Objective: ${topics.length}개)`}
                </label>
                {topics.length < 5 && (
                  <button
                    onClick={addTopic}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 주제 추가
                  </button>
                )}
              </div>

              {topics.map((topic, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <span className="flex items-center justify-center w-8 h-10 bg-gray-100 rounded text-gray-600 font-medium text-sm">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => updateTopic(index, e.target.value)}
                    placeholder={
                      index === 0 ? '예: Option 타입' : '예: Result 타입'
                    }
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {topics.length > 1 && (
                    <button
                      onClick={() => removeTopic(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              disabled={topics.every((t) => !t.trim()) || loading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition font-medium"
            >
              {loading ? '시작 중...' : '🚀 학습 시작'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
            <p className="text-sm text-yellow-800 mb-2">
              💡 <strong>학습 방법:</strong> AI의 설명을 듣고{' '}
              <code>&lt;IS&gt;</code> 태그 안에 내용을 요약해야 다음 단계로
              진행됩니다.
            </p>
            {topics.length > 1 && (
              <p className="text-sm text-yellow-800 mt-2">
                🎯 <strong>Multi-Objective 모드:</strong> {topics.length}
                개의 주제를 순차적으로 학습하며, 이전 주제와 연결지어
                이해해야 합니다.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">
              🦀 Rust 학습
              {progress && progress.totalTopics > 1 ? ' (Multi-Objective)' : ''}
            </h1>
            {progress && progress.totalTopics > 1 ? (
              <div className="mt-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {progress.completedTopics.map((topic: string) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                    >
                      ✅ {topic}
                    </span>
                  ))}
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    🔄 {progress.currentTopic}
                  </span>
                  <span className="text-gray-400 text-xs">
                    ({progress.currentIndex + 1}/{progress.totalTopics})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                주제: {progress?.currentTopic || topics[0]} | 단계: {stepCount}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleRolePlay}
              className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
                rolePlayMode
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {rolePlayMode ? '🎭 역할극 ON' : '📚 역할극 OFF'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium"
            >
              📥 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* Tip Bar */}
      {tip && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <p className="text-sm text-blue-800">{tip}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} role={msg.role} content={msg.content} />
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <LoadingSpinner message="AI가 응답하는 중..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t px-6 py-3 flex gap-2">
        {progress &&
          progress.totalTopics > 1 &&
          progress.currentIndex < progress.totalTopics - 1 && (
            <button
              onClick={handleNextTopic}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 transition text-sm font-medium"
            >
              ➡️ 다음 주제
            </button>
          )}
      </div>

      {/* Input */}
      <InputArea onSend={handleSendMessage} disabled={loading} />
    </div>
  );
}
