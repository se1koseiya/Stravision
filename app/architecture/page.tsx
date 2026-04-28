import SystemArchitectureDiagram from '@/components/architecture-diagram';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Architecture - Berry Realm',
  description: 'Interactive system architecture diagram for Berry Realm Platform',
};

export default function ArchitecturePage() {
  return (
    <main className="w-screen h-screen m-0 p-0 overflow-hidden">
      <SystemArchitectureDiagram />
    </main>
  );
}
