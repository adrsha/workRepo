export const parseMarkdown = (text) => {
    if (!text) return '';
    
    return text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Bold and Italic
        .replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/__(.*?)__/gim, '<strong>$1</strong>')
        .replace(/_(.*?)_/gim, '<em>$1</em>')
        
        // Code
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        .replace(/```([^```]+)```/gim, '<pre><code>$1</code></pre>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
        
        // Strikethrough
        .replace(/~~(.*)~~/gim, '<del>$1</del>')
        
        // Horizontal Rule
        .replace(/^---$/gim, '<hr>')
        
        // Lists
        .replace(/^\* (.*)$/gim, '<li>$1</li>')
        .replace(/^- (.*)$/gim, '<li>$1</li>')
        .replace(/^\+ (.*)$/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*)$/gim, '<li>$1</li>')
        
        // Blockquotes
        .replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>')
        
        // Line breaks
        .replace(/\n/gim, '<br>');
};

// Component for rendering markdown content
export const MarkdownContent = ({ content, className = '' }) => (
    <div 
        className={`markdown-content ${className}`}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
);
