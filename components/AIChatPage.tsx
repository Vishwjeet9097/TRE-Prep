import React from 'react';
import AIChatAssistant from './AIChatAssistant';

const AIChatPage: React.FC = () => {
    return (
        <div className="flex-1 h-full w-full bg-[#F9FBFF] overflow-hidden">
            <AIChatAssistant variant="full-page" />
        </div>
    );
};

export default AIChatPage;
