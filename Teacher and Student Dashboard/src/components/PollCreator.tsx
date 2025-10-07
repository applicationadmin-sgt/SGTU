import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Plus, 
  Trash2, 
  Play, 
  Square, 
  BarChart3, 
  Users,
  Clock
} from 'lucide-react';

interface Poll {
  id: string;
  question: string;
  type: 'mcq' | 'short' | 'yesno';
  options?: string[];
  responses: any[];
  isActive: boolean;
  createdAt: Date;
}

interface PollOption {
  text: string;
  votes: number;
}

const mockPolls: Poll[] = [
  {
    id: '1',
    question: 'Which React Hook is used for managing state?',
    type: 'mcq',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    responses: [
      { student: 'Alice', answer: 'useState' },
      { student: 'Bob', answer: 'useState' },
      { student: 'Charlie', answer: 'useEffect' },
      { student: 'Diana', answer: 'useState' }
    ],
    isActive: false,
    createdAt: new Date(Date.now() - 600000)
  },
  {
    id: '2',
    question: 'Rate your understanding of React Hooks (1-5)',
    type: 'short',
    responses: [
      { student: 'Alice', answer: '4' },
      { student: 'Bob', answer: '3' },
      { student: 'Charlie', answer: '5' }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 180000)
  }
];

export function PollCreator() {
  const [polls, setPolls] = useState<Poll[]>(mockPolls);
  const [newPoll, setNewPoll] = useState({
    question: '',
    type: 'mcq' as Poll['type'],
    options: ['', '']
  });
  const [isCreating, setIsCreating] = useState(false);

  const addOption = () => {
    setNewPoll({
      ...newPoll,
      options: [...newPoll.options, '']
    });
  };

  const removeOption = (index: number) => {
    setNewPoll({
      ...newPoll,
      options: newPoll.options.filter((_, i) => i !== index)
    });
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newPoll.options];
    updatedOptions[index] = value;
    setNewPoll({
      ...newPoll,
      options: updatedOptions
    });
  };

  const createPoll = () => {
    if (!newPoll.question.trim()) return;

    const poll: Poll = {
      id: Date.now().toString(),
      question: newPoll.question,
      type: newPoll.type,
      options: newPoll.type === 'mcq' ? newPoll.options.filter(o => o.trim()) : undefined,
      responses: [],
      isActive: false,
      createdAt: new Date()
    };

    setPolls([poll, ...polls]);
    setNewPoll({ question: '', type: 'mcq', options: ['', ''] });
    setIsCreating(false);
  };

  const togglePoll = (pollId: string) => {
    setPolls(polls.map(poll => ({
      ...poll,
      isActive: poll.id === pollId ? !poll.isActive : false
    })));
  };

  const getResults = (poll: Poll) => {
    if (poll.type === 'mcq' && poll.options) {
      return poll.options.map(option => ({
        text: option,
        votes: poll.responses.filter(r => r.answer === option).length
      }));
    }
    return [];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Create Poll Button */}
      <div className="mb-4">
        <Button 
          onClick={() => setIsCreating(true)} 
          className="w-full"
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Poll
        </Button>
      </div>

      {/* Create Poll Form */}
      {isCreating && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Create Poll</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Question</label>
              <Textarea
                placeholder="Enter your question..."
                value={newPoll.question}
                onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select 
                value={newPoll.type} 
                onValueChange={(value: Poll['type']) => setNewPoll({ ...newPoll, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="short">Short Answer</SelectItem>
                  <SelectItem value="yesno">Yes/No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newPoll.type === 'mcq' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Options</label>
                <div className="space-y-2">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                      {newPoll.options.length > 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={createPoll} className="flex-1">
                Create Poll
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Polls List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {polls.map((poll) => (
          <Card key={poll.id} className={poll.isActive ? 'border-green-200 bg-green-50' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{poll.question}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {poll.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(poll.createdAt)}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {poll.responses.length} responses
                    </span>
                  </div>
                </div>
                <Button
                  variant={poll.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => togglePoll(poll.id)}
                >
                  {poll.isActive ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            {poll.responses.length > 0 && (
              <CardContent className="pt-0">
                {poll.type === 'mcq' && poll.options && (
                  <div className="space-y-2">
                    {getResults(poll).map((result, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm flex-1">{result.text}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded overflow-hidden">
                            <div 
                              className="h-full bg-blue-500"
                              style={{ 
                                width: `${poll.responses.length ? (result.votes / poll.responses.length) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {result.votes}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {poll.type === 'short' && (
                  <div className="space-y-1">
                    {poll.responses.slice(0, 3).map((response, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded">
                        <strong>{response.student}:</strong> {response.answer}
                      </div>
                    ))}
                    {poll.responses.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{poll.responses.length - 3} more responses
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {polls.length === 0 && !isCreating && (
          <div className="text-center text-muted-foreground py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No polls created yet</p>
            <p className="text-sm">Create your first poll to engage students</p>
          </div>
        )}
      </div>
    </div>
  );
}