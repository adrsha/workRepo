import styles from '../styles/Markdown.module.css';

export const parseMarkdown = (text) => {
    if (!text) return '';
    
    let html = text
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
        
        // Code blocks (before inline code)
        .replace(/```([^```]+)```/gim, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
        
        // Strikethrough
        .replace(/~~(.*)~~/gim, '<del>$1</del>')
        
        // Horizontal Rule
        .replace(/^---$/gim, '<hr>')
        
        // Blockquotes
        .replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>');
    
    // Handle lists properly
    html = html.replace(/^(\d+\. .*(?:\n\d+\. .*)*)/gim, (match) => {
        const items = match.split('\n').map(line => 
            line.replace(/^\d+\. (.*)$/, '<li>$1</li>')
        ).join('');
        return `<ol>${items}</ol>`;
    });
    
    html = html.replace(/^([*+-] .*(?:\n[*+-] .*)*)/gim, (match) => {
        const items = match.split('\n').map(line => 
            line.replace(/^[*+-] (.*)$/, '<li>$1</li>')
        ).join('');
        return `<ul>${items}</ul>`;
    });
    
    // Line breaks
    html = html.replace(/\n/gim, '<br>');
    
    return html;
};

// Component for rendering markdown content
export const MarkdownContent = ({ content, className = '', showRaw = false }) => {
    if (showRaw) {
        return (
            <div className={`${styles.markdownContent} ${className}`}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {content}
                </pre>
            </div>
        );
    }
    
    return (
        <div 
            className={`${styles.markdownContent} ${className}`}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />
    );
};
