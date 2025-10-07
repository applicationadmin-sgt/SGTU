import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  BarChart3,
  AlertCircle 
} from 'lucide-react';

interface Poll {
  id: string;
  question: string;
  type: 'mcq' | 'short' | 'yesno';
  options?: string[];
  isActive: boolean;
  hasResponded: boolean;
  timeLeft?: number;
  totalResponses: number;
  results?: Array<{ option: string; percentage: number; count: number }>;
}

const mockPolls: Poll[] = [
  {
    id: '1',
    question: 'Which React Hook is used for managing state?',
    type: 'mcq',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    isActive: false,
    hasResponded: true,
    totalResponses: 12,
    results: [
      { option: 'useState', percentage: 75, count: 9 },
      { option: 'useEffect', percentage: 16, count: 2 },
      { option: 'useContext', percentage: 8, count: 1 },
      { option: 'useReducer', percentage: 0, count: 0 }
    ]
  },
  {
    id: '2',
    question: 'Rate your understanding of React Hooks (1-5)',
    type: 'short',
    isActive: true,
    hasResponded: false,
    timeLeft: 45,
    totalResponses: 8
  },
  {
    id: '3',
    question: 'Do you understand the concept of component lifecycle?',
    type: 'yesno',
    options: ['Yes', 'No'],
    isActive: false,
    hasResponded: true,
    totalResponses: 12,
    results: [
      { option: 'Yes', percentage: 83, count: 10 },
      { option: 'No', percentage: 17, count: 2 }
    ]
  }
];

export function PollViewer() {
  const [polls, setPolls] = useState<Poll[]>(mockPolls);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const activePoll = polls.find(poll => poll.isActive);

  const submitAnswer = (pollId: string) => {
    const answer = selectedAnswers[pollId];
    if (!answer) return;

    setPolls(polls.map(poll => 
      poll.id === pollId 
        ? { ...poll, hasResponded: true }
        : poll
    ));

    // Clear the selected answer
    setSelectedAnswers({ ...selectedAnswers, [pollId]: '' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Active Poll */}
      {activePoll && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-green-600" />
                Active Poll
              </CardTitle>
              {activePoll.timeLeft && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(activePoll.timeLeft)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-medium mb-4">{activePoll.question}</h3>
            
            {!activePoll.hasResponded ? (
              <div className="space-y-4">
                {activePoll.type === 'mcq' && activePoll.options && (
                  <RadioGroup
                    value={selectedAnswers[activePoll.id] || ''}
                    onValueChange={(value) => 
                      setSelectedAnswers({ ...selectedAnswers, [activePoll.id]: value })
                    }
                  >
                    {activePoll.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${activePoll.id}-${index}`} />
                        <Label htmlFor={`${activePoll.id}-${index}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {activePoll.type === 'short' && (
                  <Input
                    placeholder="Enter your answer..."
                    value={selectedAnswers[activePoll.id] || ''}
                    onChange={(e) => 
                      setSelectedAnswers({ ...selectedAnswers, [activePoll.id]: e.target.value })
                    }
                  />
                )}

                {activePoll.type === 'yesno' && (
                  <RadioGroup
                    value={selectedAnswers[activePoll.id] || ''}
                    onValueChange={(value) => 
                      setSelectedAnswers({ ...selectedAnswers, [activePoll.id]: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id={`${activePoll.id}-yes`} />
                      <Label htmlFor={`${activePoll.id}-yes`}>Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id={`${activePoll.id}-no`} />
                      <Label htmlFor={`${activePoll.id}-no`}>No</Label>
                    </div>
                  </RadioGroup>
                )}

                <Button 
                  onClick={() => submitAnswer(activePoll.id)}
                  disabled={!selectedAnswers[activePoll.id]}
                  className="w-full"
                >
                  Submit Answer
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Answer submitted!</p>
                <p className="text-sm text-muted-foreground">
                  {activePoll.totalResponses} students have responded
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Polls */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <h3 className="font-medium text-muted-foreground">Previous Polls</h3>
        
        {polls.filter(poll => !poll.isActive).map((poll) => (
          <Card key={poll.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{poll.question}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {poll.type.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {poll.totalResponses} responses
                </span>
                {poll.hasResponded && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Answered
                  </Badge>
                )}
              </div>
            </CardHeader>

            {poll.results && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {poll.results.map((result, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{result.option}</span>
                        <span className="text-muted-foreground">
                          {result.count} ({result.percentage}%)
                        </span>
                      </div>
                      <Progress value={result.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {polls.filter(poll => !poll.isActive).length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No previous polls</p>
          </div>
        )}
      </div>
    </div>
  );
}