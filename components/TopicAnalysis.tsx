
import React, { useMemo } from 'react';
import { ExamAttempt, ExamPaper } from '../types';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface TopicAnalysisProps {
    attempts: ExamAttempt[];
    papers: ExamPaper[];
}

const TopicAnalysis: React.FC<TopicAnalysisProps> = ({ attempts, papers }) => {
    const stats = useMemo(() => {
        const topicMap: Record<string, { total: number; correct: number }> = {};

        attempts.forEach(attempt => {
            const paper = papers.find(p => p.id === attempt.paperId);
            if (!paper) return;

            attempt.responses.forEach(response => {
                const question = paper.questions.find(q => q.id === response.questionId);
                if (!question) return;

                const topic = question.topic || 'General';
                if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0 };

                topicMap[topic].total += 1;
                if (question.correctOptionId === response.selectedOptionId) {
                    topicMap[topic].correct += 1;
                }
            });
        });

        return Object.entries(topicMap)
            .map(([topic, data]) => ({
                topic,
                accuracy: Math.round((data.correct / data.total) * 100),
                count: data.total
            }))
            .sort((a, b) => a.accuracy - b.accuracy); // Sort by weakness (lowest first)
    }, [attempts, papers]);

    if (stats.length === 0) return null;

    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-50 rounded-2xl">
                    <TrendingUp className="text-rose-600" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800">Weakness Intelligence</h3>
                    <p className="text-sm text-slate-500 font-medium">AI-detected areas for improvement</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.map((stat, i) => (
                    <div key={stat.topic} className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-700">{stat.topic}</span>
                            <span className={`${stat.accuracy < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>{stat.accuracy}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${stat.accuracy < 40 ? 'bg-rose-500' :
                                        stat.accuracy < 70 ? 'bg-amber-400' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${stat.accuracy}%` }}
                            />
                        </div>
                        {stat.accuracy < 40 && (
                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-rose-500 mt-1">
                                <AlertTriangle size={10} />
                                <span>Needs Focus</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopicAnalysis;
