import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Send, MessageSquare, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface ChatSystemProps {
  role: 'teacher' | 'student';
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'chat' | 'qa' | 'private';
  isTeacher?: boolean;
}

interface Question {
  id: string;
  student: string;
  question: string;
  timestamp: Date;
  answered: boolean;
  answer?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Mr. Johnson',
    content: 'Welcome to today\'s React Hooks lesson!',
    timestamp: new Date(Date.now() - 300000),
    type: 'chat',
    isTeacher: true
  },
  {
    id: '2',
    sender: 'Alice',
    content: 'Thank you! Looking forward to learning.',
    timestamp: new Date(Date.now() - 280000),
    type: 'chat'
  },
  {
    id: '3',
    sender: 'Bob',
    content: 'Can we go over useState again?',
    timestamp: new Date(Date.now() - 120000),
    type: 'chat'
  }
];

const mockQuestions: Question[] = [
  {
    id: '1',
    student: 'Alice',
    question: 'What\'s the difference between useState and useEffect?',
    timestamp: new Date(Date.now() - 180000),
    answered: true,
    answer: 'useState manages state, useEffect handles side effects.'
  },
  {
    id: '2',
    student: 'Charlie',
    question: 'Can we use multiple useEffect hooks in one component?',
    timestamp: new Date(Date.now() - 60000),
    answered: false
  }
];

export function ChatSystem({ role }: ChatSystemProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [newMessage, setNewMessage] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [chatVisible, setChatVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (type: 'chat' | 'qa' | 'private' = 'chat') => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: role === 'teacher' ? 'Mr. Johnson' : 'You',
      content: newMessage,
      timestamp: new Date(),
      type,
      isTeacher: role === 'teacher'
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const sendQuestion = () => {
    if (!newQuestion.trim()) return;

    const question: Question = {
      id: Date.now().toString(),
      student: 'You',
      question: newQuestion,
      timestamp: new Date(),
      answered: false
    };

    setQuestions([...questions, question]);
    setNewQuestion('');
  };

  const answerQuestion = (questionId: string, answer: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, answered: true, answer } : q
    ));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-full flex flex-col">
      <Tabs defaultValue="public" className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="qa">Q&A</TabsTrigger>
            {role === 'teacher' && <TabsTrigger value="private">Private</TabsTrigger>}
            {role === 'student' && <TabsTrigger value="materials">Files</TabsTrigger>}
          </TabsList>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatVisible(!chatVisible)}
          >
            {chatVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        {chatVisible && (
          <>
            <TabsContent value="public" className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.filter(m => m.type === 'chat').map((message) => (
                  <div key={message.id} className="flex gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={message.isTeacher ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}>
                        {message.sender.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.sender}</span>
                        {message.isTeacher && <Badge variant="secondary" className="text-xs">Teacher</Badge>}
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={() => sendMessage()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qa" className="flex-1 flex flex-col p-0">
              {role === 'student' && (
                <div className="border-b p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a question..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendQuestion()}
                    />
                    <Button onClick={sendQuestion}>
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {questions.map((question) => (
                  <div key={question.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{question.student}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(question.timestamp)}</span>
                      </div>
                      <Badge variant={question.answered ? 'default' : 'secondary'}>
                        {question.answered ? 'Answered' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{question.question}</p>
                    {question.answered && question.answer && (
                      <div className="bg-muted p-2 rounded text-sm">
                        <strong>Answer:</strong> {question.answer}
                      </div>
                    )}
                    {role === 'teacher' && !question.answered && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Type your answer..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              answerQuestion(question.id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <Button size="sm">Answer</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {role === 'teacher' && (
              <TabsContent value="private" className="flex-1 flex flex-col p-3">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Select a student to start a private conversation</p>
                </div>
              </TabsContent>
            )}

            {role === 'student' && (
              <TabsContent value="materials" className="flex-1 p-3">
                <div className="space-y-2">
                  <div className="p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <p className="text-sm font-medium">lesson-notes.pdf</p>
                    <p className="text-xs text-muted-foreground">Shared 5 mins ago</p>
                  </div>
                  <div className="p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <p className="text-sm font-medium">code-examples.zip</p>
                    <p className="text-xs text-muted-foreground">Shared 10 mins ago</p>
                  </div>
                </div>
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </Card>
  );
}