
import React, { useState, useRef, useEffect } from 'react';
import { ChatState, ChatHistoryItem } from '../types';

interface ChatModalProps {
    chatState: ChatState;
    onClose: () => void;
    onSendMessage: (msg: string) => void;
    onAttachmentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: () => void;
    targetImageTitle: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({ chatState, onClose, onSendMessage, onAttachmentChange, onRemoveAttachment, targetImageTitle }) => {
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatState.history]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        onSendMessage(message);
        setMessage('');
    };

    if (!chatState.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="chat-title">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col transform transition-all animate-fade-in-up">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 id="chat-title" className="text-xl font-bold text-[#5D4037]">Refine: <span className="text-[#C19A6B]">{targetImageTitle}</span></h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600" aria-label="Close chat">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatState.history.map((msg: ChatHistoryItem, index: number) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#8D6E63] text-white rounded-br-lg' : 'bg-gray-200 text-[#5D4037] rounded-bl-lg'}`}>
                                {msg.image && (
                                    <img src={msg.image} alt="User reference" className="mb-2 rounded-lg max-w-full h-auto" />
                                )}
                                {msg.text && <p className="text-sm" style={{whiteSpace: 'pre-wrap'}}>{msg.text}</p>}
                            </div>
                        </div>
                    ))}
                     {chatState.isSending && (
                        <div className="flex justify-start">
                            <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-gray-200 text-[#5D4037] rounded-bl-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="border-t bg-gray-50 rounded-b-2xl">
                    {chatState.attachment && (
                        <div className="p-2 border-b bg-gray-100 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <img src={chatState.attachment.data} className="w-10 h-10 rounded object-cover flex-shrink-0" alt="Attachment preview" />
                                <span className="truncate text-gray-600 font-medium">{chatState.attachment.name}</span>
                            </div>
                            <button onClick={onRemoveAttachment} type="button" className="p-1 rounded-full text-gray-500 hover:bg-gray-300 hover:text-gray-700" aria-label="Remove attachment">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                    <div className="p-4 flex items-center space-x-2">
                        <input type="file" ref={attachmentInputRef} onChange={onAttachmentChange} className="hidden" accept="image/jpeg, image/png, image/webp" />
                        <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={chatState.isSending} className="p-2 text-gray-500 hover:text-[#8D6E63] rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Attach image">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e); e.preventDefault(); } }}
                            placeholder="e.g., 'Make her look more like this...'"
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C19A6B] focus:border-[#C19A6B] resize-none"
                            rows={2}
                            disabled={chatState.isSending}
                            aria-label="Your refinement request"
                        />
                        <button type="submit" disabled={(!message.trim() && !chatState.attachment) || chatState.isSending} className="p-3 bg-[#C19A6B] text-white rounded-full hover:bg-[#8D6E63] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" aria-label="Send message">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
