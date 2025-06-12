
import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { JobPost } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface SwipeCardProps {
  job: JobPost;
  onSwipe: (direction: 'left' | 'right', jobId: string) => void;
  onNegotiate: () => void;
}

export function SwipeCard({ job, onSwipe, onNegotiate }: SwipeCardProps) {
  const [exitX, setExitX] = useState<number>(0);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const cardElem = useRef<HTMLDivElement>(null);
  
  // Transform x position to rotation
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  
  // Transform x to card opacity
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0.5, 0.9, 1, 0.9, 0.5]
  );

  // Background color based on direction
  const background = useTransform(
    x, 
    [-200, 0, 200], 
    ['rgba(255, 100, 100, 0.1)', 'rgba(255, 255, 255, 0)', 'rgba(100, 255, 100, 0.1)']
  );

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      setExitX(1000);
      controls.start({
        x: 1000,
        transition: { duration: 0.3 }
      });
      onSwipe('right', job.id);
    } else if (info.offset.x < -threshold) {
      setExitX(-1000);
      controls.start({
        x: -1000,
        transition: { duration: 0.3 }
      });
      onSwipe('left', job.id);
    }
  };

  return (
    <motion.div
      ref={cardElem}
      className="swipe-card rounded-xl border overflow-hidden bg-white shadow-lg"
      style={{ x, rotate, opacity, background }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      exit={{ x: exitX, opacity: 0, transition: { duration: 0.2 } }}
      whileTap={{ scale: 1.05 }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={job.client.avatar} alt={job.client.name} />
              <AvatarFallback>{job.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{job.client.name}</h3>
              {job.client.lensHandle && (
                <p className="text-xs text-gray-500">{job.client.lensHandle}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={job.immediate ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
            {job.immediate ? 'Immediate' : 'Flexible'}
          </Badge>
        </div>

        <h2 className="text-xl font-bold mb-2">{job.title}</h2>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{job.description}</p>

        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Budget</span>
            <span className="text-sm font-bold">
              {job.budget.min}-{job.budget.max} {job.budget.currency}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Duration</span>
            <span className="text-sm">{job.duration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Location</span>
            <span className="text-sm capitalize">{job.location}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {job.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="skill-tag">
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="skill-tag">+{job.skills.length - 4} more</span>
          )}
        </div>
      </div>

      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Posted {job.postedAt}
        </div>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onNegotiate();
            }}
          >
            Negotiate
          </Button>
          <Button 
            size="sm"
            className="bg-web3-primary hover:bg-web3-secondary text-white"
            onClick={(e) => {
              e.stopPropagation();
              controls.start({
                x: 1000,
                transition: { duration: 0.3 }
              });
              onSwipe('right', job.id);
            }}
          >
            Accept
          </Button>
        </div>
      </div>

      {/* Swipe overlay indicators */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-start pl-8"
        style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
      >
        <div className="bg-green-500 text-white font-bold py-2 px-4 rounded-full">
          ACCEPT
        </div>
      </motion.div>

      <motion.div 
        className="absolute inset-0 flex items-center justify-end pr-8"
        style={{ opacity: useTransform(x, [0, -100], [0, 1]) }}
      >
        <div className="bg-gray-500 text-white font-bold py-2 px-4 rounded-full">
          SKIP
        </div>
      </motion.div>
    </motion.div>
  );
}