'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, api } from '@/lib/convex';
import { Id } from '../../convex/_generated/dataModel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TaskComment = {
  _id: Id<"taskComments">;
  taskId: Id<"tasks">;
  author: string;
  content: string;
  contentType?: 'text' | 'markdown';
  attachments?: Array<{
    storageId: Id<"_storage">;
    filename: string;
    mimeType: string;
    size: number;
  }>;
  _creationTime: number;
};

interface CommentSectionProps {
  taskId: Id<"tasks">;
  taskTitle: string;
}

const AGENT_ICONS: Record<string, string> = {
  mike: '👤',
  nash: '♟️',
  dev: '⚡',
  otto: '📋',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function AttachmentLink({ storageId, filename, mimeType, size }: { 
  storageId: Id<"_storage">; 
  filename: string; 
  mimeType: string;
  size: number;
}) {
  const url = useQuery(api.comments.getAttachmentUrl, { storageId });
  
  const isImage = mimeType.startsWith('image/');
  const isCode = mimeType.includes('text/') || filename.match(/\.(ts|tsx|js|jsx|json|md|log|txt|py|sh|yaml|yml)$/);
  
  if (!url) {
    return (
      <span className="text-xs text-stone-400">Loading...</span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors group"
    >
      <span className="text-lg">
        {isImage ? '🖼️' : isCode ? '📄' : '📎'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-700 truncate group-hover:text-amber-700">
          {filename}
        </p>
        <p className="text-xs text-stone-400">{formatBytes(size)}</p>
      </div>
      <svg className="w-4 h-4 text-stone-400 group-hover:text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  );
}

export function CommentSection({ taskId, taskTitle }: CommentSectionProps) {
  const comments = useQuery(api.comments.byTask, { taskId }) as TaskComment[] | undefined;
  const addComment = useMutation(api.comments.add);
  const generateUploadUrl = useMutation(api.comments.generateUploadUrl);
  
  const [newComment, setNewComment] = useState('');
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [attachments, setAttachments] = useState<Array<{
    storageId: Id<"_storage">;
    filename: string;
    mimeType: string;
    size: number;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments: Array<{
        storageId: Id<"_storage">;
        filename: string;
        mimeType: string;
        size: number;
      }> = [];
      for (const file of Array.from(files)) {
        // Get upload URL
        const uploadUrl = await generateUploadUrl();
        
        // Upload file
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        
        const { storageId } = await response.json();
        
        newAttachments.push({
          storageId,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() && attachments.length === 0) return;

    await addComment({
      taskId,
      author: 'mike',
      content: newComment || (attachments.length > 0 ? '📎 Attached files' : ''),
      contentType: isMarkdown ? 'markdown' : 'text',
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setNewComment('');
    setAttachments([]);
    setIsMarkdown(false);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-500 uppercase mb-3">
        Comments ({comments?.length || 0})
      </h3>
      
      {comments === undefined ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-400 py-4">No comments yet</p>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map(comment => {
            const icon = AGENT_ICONS[comment.author.toLowerCase()] || '💬';
            return (
              <div key={comment._id} className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm flex-shrink-0">
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-900">{comment.author}</span>
                    <span className="text-xs text-stone-400">
                      {new Date(comment._creationTime).toLocaleString()}
                    </span>
                    {comment.contentType === 'markdown' && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">md</span>
                    )}
                  </div>
                  
                  {/* Comment content */}
                  {comment.contentType === 'markdown' ? (
                    <div className="text-sm text-stone-600 mt-1 prose prose-sm prose-stone max-w-none prose-pre:bg-stone-800 prose-pre:text-stone-100 prose-code:text-amber-600 prose-code:bg-stone-100 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comment.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-600 mt-1 whitespace-pre-wrap">{comment.content}</p>
                  )}
                  
                  {/* Attachments */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {comment.attachments.map((attachment, idx) => (
                        <AttachmentLink
                          key={idx}
                          storageId={attachment.storageId}
                          filename={attachment.filename}
                          mimeType={attachment.mimeType}
                          size={attachment.size}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Pending attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-lg">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-stone-200">
                <span className="text-xs text-stone-600 truncate max-w-[120px]">{att.filename}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-stone-400 hover:text-red-500"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isMarkdown ? "Write markdown..." : "Add a comment..."}
              rows={isMarkdown ? 4 : 1}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Markdown toggle */}
          <button
            type="button"
            onClick={() => setIsMarkdown(!isMarkdown)}
            className={`px-2 py-1 text-xs rounded-md border transition-colors ${
              isMarkdown 
                ? 'bg-purple-100 border-purple-300 text-purple-700' 
                : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
            }`}
            title="Toggle Markdown mode"
          >
            <span className="font-mono">M↓</span>
          </button>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="*/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2 py-1 text-xs rounded-md border bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors disabled:opacity-50"
            title="Attach files"
          >
            {isUploading ? '⏳' : '📎'}
          </button>

          <div className="flex-1" />

          {/* Submit */}
          <button
            type="submit"
            disabled={!newComment.trim() && attachments.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
