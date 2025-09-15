import * as React from 'react';
import { useEffect, useRef } from 'react';
import { BracketsData } from '../types';

// Import brackets-viewer CSS and JS from node_modules
// Note: We need to import these at build time, not runtime
import 'brackets-viewer/dist/brackets-viewer.min.css';

// Since brackets-viewer doesn't have types, we'll declare it
declare global {
    interface Window {
        bracketsViewer: {
            render: (data: any, options?: any) => void;
        };
    }
}

interface BracketsViewerProps {
    data: BracketsData;
    onMatchClick?: (match: any) => void;
    selector?: string;
    clear?: boolean;
    customRoundNames?: { [key: string]: string };
    participantImages?: { [key: string]: string };
}

const BracketsViewer: React.FC<BracketsViewerProps> = ({
    data,
    onMatchClick,
    selector = '.brackets-viewer',
    clear = true,
    customRoundNames,
    participantImages
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load brackets-viewer from node_modules
        const loadBracketsViewer = async () => {
            try {
                // Check if brackets-viewer is already loaded
                if (window.bracketsViewer) {
                    renderBrackets();
                    return;
                }

                // Import the brackets-viewer JS module
                await import('brackets-viewer/dist/brackets-viewer.min.js');

                // Wait a bit for the library to initialize
                setTimeout(() => {
                    if (window.bracketsViewer) {
                        renderBrackets();
                    }
                }, 100);
            } catch (error) {
                console.error('Error loading brackets-viewer:', error);
            }
        };

        loadBracketsViewer();
    }, []);

    useEffect(() => {
        if (window.bracketsViewer && containerRef.current) {
            renderBrackets();
        }
    }, [data, customRoundNames, participantImages]);

    const renderBrackets = () => {
        if (!window.bracketsViewer || !containerRef.current) {
            return;
        }

        try {
            const renderOptions: any = {
                selector: selector || '.brackets-viewer',
                clear
            };

            // Add custom round names if provided
            if (customRoundNames) {
                renderOptions.customRoundNames = customRoundNames;
            }

            // Add participant images if provided
            if (participantImages) {
                renderOptions.participantImages = participantImages;
            }

            // Add match click handler
            if (onMatchClick) {
                renderOptions.onMatchClick = onMatchClick;
            }

            // Render the brackets
            const renderData = {
                stages: data.stage || [],
                groups: data.group || [],
                rounds: data.round || [],
                matches: data.match || [],
                matchGames: data.match_game || [],
                participants: data.participant || []
            };

            window.bracketsViewer.render(renderData, renderOptions);
        } catch (error) {
            console.error('Error rendering brackets:', error);
        }
    };

    return (
        <div>
            <div
                ref={containerRef}
                className="brackets-viewer"
                style={{ width: '100%', height: '100%', minHeight: '400px' }}
            >
                {/* Fallback content while loading or if brackets-viewer fails */}
                {!window.bracketsViewer && (
                    <div style={{ padding: '20px' }}>
                        <h3>Loading Tournament Brackets...</h3>
                        <p>Participants: {data.participant?.length || 0}</p>
                        <p>Matches: {data.match?.length || 0}</p>
                        <p>Stages: {data.stage?.length || 0}</p>
                        {data.stage?.map((stage, index) => (
                            <div key={index}>
                                <strong>{stage.name}</strong> - {stage.type}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BracketsViewer;