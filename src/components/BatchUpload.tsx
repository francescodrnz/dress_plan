import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Upload, FileJson, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface BatchLog {
  type: 'success' | 'error';
  message: string;
}

export function BatchUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<BatchLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const processBatch = async () => {
    setUploading(true);
    setLogs([]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      const data = JSON.parse(jsonText);
      if (!Array.isArray(data)) throw new Error('Il JSON deve essere un array di oggetti');

      for (const item of data) {
        const targetFile = files.find(f => f.name === item.filename);

        if (!targetFile) {
          setLogs(prev => [...prev, { type: 'error', message: `File "${item.filename}" non trovato nella dropzone.` }]);
          continue;
        }

        try {
          // 1. Upload file
          const fileExt = targetFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(filePath, targetFile);

          if (uploadError) throw uploadError;

          // 2. Get URL
          const { data: { publicUrl } } = supabase.storage
            .from('item-images')
            .getPublicUrl(filePath);

          // 3. Insert DB
          const { error: dbError } = await supabase.from('items').insert({
            user_id: user.id,
            image_url: publicUrl,
            category: item.category,
            warmth_score: item.warmth_score || 50,
            elegance_score: item.elegance_score || 50,
            description: item.description || '',
            color: item.color || '',
            pattern: item.pattern || '',
            style_tags: item.style_tags || [],
            wardrobe_ids: item.wardrobe_ids || []
          });

          if (dbError) throw dbError;

          setLogs(prev => [...prev, { type: 'success', message: `Caricato con successo: ${item.filename}` }]);
        } catch (err: any) {
          setLogs(prev => [...prev, { type: 'error', message: `Errore durante l'upload di ${item.filename}: ${err.message}` }]);
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { type: 'error', message: `Errore fatale: ${err.message}` }]);
    } finally {
      setUploading(false);
      setFiles([]);
      setJsonText('');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Upload</CardTitle>
          <CardDescription>Trascina le immagini e incolla il JSON per il caricamento massivo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <Upload className="mx-auto h-10 w-10 text-zinc-400 mb-2" />
            <p className="text-sm font-medium">
              {files.length > 0 ? `${files.length} file selezionati` : 'Clicca per selezionare immagini'}
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </div>

          {/* JSON Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileJson className="h-4 w-4" /> JSON Metadata
            </label>
            <textarea 
              className="w-full h-48 rounded-md border border-zinc-200 p-2 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-950"
              placeholder='[{"filename": "foto1.jpg", "category": "top", "warmth_score": 70, ...}]'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={processBatch} 
            disabled={uploading || files.length === 0 || !jsonText}
          >
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Elaborazione...</> : 'Process & Upload'}
          </Button>

          {/* Log Area */}
          {logs.length > 0 && (
            <div className="mt-4 p-4 rounded-md bg-zinc-100 dark:bg-zinc-900 max-h-48 overflow-y-auto space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={`text-xs flex items-center gap-2 ${log.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {log.type === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
