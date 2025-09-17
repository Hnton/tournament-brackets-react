import * as React from 'react';

interface PlayersTableProps {
    children: React.ReactNode;
    caption?: string;
    subtitle?: string;
}

const PlayersTable: React.FC<PlayersTableProps> = ({ children, caption, subtitle }: PlayersTableProps) => {
    return (
        <div style={{ padding: 12 }}>
            {caption && <h3>{caption}</h3>}
            {subtitle && <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</p>}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: 8 }}>Name</th>
                        <th style={{ padding: 8 }}>Phone</th>
                        <th style={{ padding: 8 }}>Email</th>
                        <th style={{ padding: 8 }}>Membership ID</th>
                        <th style={{ padding: 8 }}>City</th>
                        <th style={{ padding: 8 }}>State</th>
                        <th style={{ padding: 8 }}>Rating</th>
                        <th style={{ padding: 8 }}>Robustness</th>
                        <th style={{ padding: 8 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {children}
                </tbody>
            </table>
        </div>
    );
};

export default PlayersTable;
