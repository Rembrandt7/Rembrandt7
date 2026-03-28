import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const renderContent = () => {
    let html = content
      // Handle bold: **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Handle italics: *text*
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Handle newlines
      .replace(/\n/g, '<br />');
    
    return { __html: html };
  };

  return <div dangerouslySetInnerHTML={renderContent()} />;
};

export default MarkdownRenderer;
