
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/icons/loading-spinner";
import { Brain, AlertTriangle, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModelOption {
  label: string;
  value: string;
}

export default function PromptPalPage() {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek/deepseek-chat-v3-0324:free');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const models: ModelOption[] = [
    { label: 'DeepSeek v3.0324 (Free)', value: 'deepseek/deepseek-chat-v3-0324:free' },
    { label: 'Qwen 14B (Free)', value: 'qwen/qwen-14b:free' },
    { label: 'Qwen Turbo (DashScope)', value: 'qwen-turbo' },
    { label: 'Qwen Plus (Balance)', value: 'qwen-plus' },
    { label: 'Qwen Max (Complex Tasks)', value: 'qwen-max' },
  ];

  const generateResponse = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    if (!apiKey.trim()) {
      setError('Please enter an API key.');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      let apiEndpoint = '';
      let requestBody: object = {};
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (model.includes('/')) {
        // OpenRouter Models
        apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          model,
          messages: [{ role: 'user', content: prompt }],
        };
      } else {
        // DashScope Models
        apiEndpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          model,
          input: { prompt },
        };
      }

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        let errorResponseMessage = `API Error ${res.status}: ${res.statusText}.`;
        let detailedApiMessage = 'No additional details from API.';
        let responseText = '';

        try {
            responseText = await res.text(); 
        } catch (textReadError) {
            console.error('Critical: Failed to read response text body from errored response:', textReadError);
            detailedApiMessage = 'Failed to read response body.';
            throw new Error(`${errorResponseMessage} ${detailedApiMessage}`);
        }

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            try {
                const errorJson = JSON.parse(responseText);
                
                if (typeof errorJson === 'object' && errorJson !== null && Object.keys(errorJson).length > 0) {
                  // console.error('API Error JSON Payload (parsed):', errorJson); // Removed to avoid duplicate logging if responseText is "{}"
                } else if (responseText.trim() !== '{}') {
                  console.warn('API Error: JSON response parsed to empty/non-object, or was not "{}". Original text excerpt:', responseText.substring(0, 200));
                }


                detailedApiMessage = errorJson?.error?.message || 
                                   errorJson?.message ||       
                                   (errorJson?.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0 && errorJson.errors[0]?.message) || 
                                   (typeof errorJson === 'object' && errorJson !== null && Object.keys(errorJson).length > 0 
                                    ? `Full error JSON: ${JSON.stringify(errorJson).substring(0, 200)}...` 
                                    : (responseText.trim() === '{}' 
                                       ? 'API returned an empty JSON object.' 
                                       : `Unexpected or malformed JSON. Raw text: ${responseText.substring(0, 100)}...`));
            } catch (jsonParseError) {
                console.error('Failed to parse API error response as JSON (Content-Type was application/json):', jsonParseError);
                detailedApiMessage = `Received non-JSON response despite Content-Type. Body: ${responseText.substring(0, 200)}...`;
            }
        } else {
            detailedApiMessage = responseText.trim() || 'API returned an empty response body.';
            if (responseText.trim() && responseText.trim() !== '{}') { 
                console.warn('API Error Text Payload (Content-Type not JSON or not specified):', responseText.substring(0,200));
            }
        }
        
        throw new Error(`${errorResponseMessage} ${detailedApiMessage}`);
      }

      const data = await res.json(); 

      if (data.error) { 
         console.error('API Data Error (res.ok was true):', data.error);
        throw new Error(data.error.message || 'Unknown error occurred from API data.');
      }

      let resultText = '';
      if (model.includes('/')) { 
        resultText = data.choices?.[0]?.message?.content || 'No response content from model.';
      } else { 
        resultText = data.output?.text || 'No response text from model.';
      }
      
      if (!resultText && data.code && data.message) { 
        console.error('DashScope specific error in successful response:', data);
        throw new Error(`API reported error: ${data.message} (Code: ${data.code})`);
      }

      setResponse(resultText);

    } catch (err: any) {
      console.error("Error in generateResponse:", err); 
      setError(err.message || 'Failed to get response. Check API key, model selection, or network.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      toast({
        title: "Copied!",
        description: "AI response copied to clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy response: ", err);
      toast({
        title: "Error",
        description: "Failed to copy response to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadResponse = () => {
    if (!response) return;
    try {
      const blob = new Blob([response], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ai_response.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
          title: "Downloaded!",
          description: "AI response download started.",
      });
    } catch (err) {
      console.error("Failed to download response: ", err);
      toast({
        title: "Error",
        description: "Failed to download response.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Card className="w-full max-w-3xl bg-card rounded-xl shadow-2xl overflow-hidden border border-border transition-all duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
          <h1 className="text-3xl font-bold text-primary-foreground flex items-center justify-center">
            <Brain className="mr-3 h-8 w-8" /> PromptPal
          </h1>
          <p className="text-sm text-indigo-100 mt-1">Your AI-powered thought partner</p>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-muted-foreground">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter or DashScope API key"
              className="bg-input border-border text-foreground focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model" className="text-muted-foreground">Choose AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="w-full bg-input border-border text-foreground focus:ring-ring">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="focus:bg-accent focus:text-accent-foreground">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-muted-foreground">Enter Your Prompt</Label>
            <Textarea
              id="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your prompt for the AI..."
              className="bg-input border-border text-foreground focus:ring-ring"
            />
          </div>

          <Button
            onClick={generateResponse}
            disabled={loading}
            className={`w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-primary-foreground font-semibold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner /> Generating Response...
              </span>
            ) : (
              'Generate Response'
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="bg-destructive/20 border-destructive text-destructive-foreground">
               <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {response && !loading && (
            <Card className="bg-muted/30 border-border rounded-lg animate-fadeIn">
              <CardHeader className="flex flex-row items-center justify-between">
                 <h2 className="text-xl font-bold text-indigo-300 flex items-center">
                    <Brain className="mr-2 h-6 w-6" /> AI Response:
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleCopyResponse} aria-label="Copy response" title="Copy response">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleDownloadResponse} aria-label="Download response" title="Download response">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">{response}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>

        <CardFooter className="bg-background/50 px-6 py-4 text-center border-t border-border">
          <p className="text-sm text-muted-foreground w-full">
            Select a model and enter your prompt to get started.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

