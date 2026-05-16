import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton = ({ rows = 5, cols = 4 }: TableSkeletonProps) => {
  return (
    <SkeletonTheme baseColor="#F1F5F9" highlightColor="#F8FAFC">
      <div className="evl-card overflow-hidden">
        <div className="px-6 py-4 border-b border-muted/40">
          <Skeleton width={150} height={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="evl-table">
            <thead>
              <tr>
                {Array(cols).fill(0).map((_, i) => (
                  <th key={i}><Skeleton width={80} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array(rows).fill(0).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array(cols).fill(0).map((_, colIndex) => (
                    <td key={colIndex}>
                      <Skeleton height={20} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SkeletonTheme>
  );
};

export const CardSkeleton = () => {
  return (
    <SkeletonTheme baseColor="#F1F5F9" highlightColor="#F8FAFC">
      <div className="evl-card p-6">
        <Skeleton height={24} width="60%" className="mb-4" />
        <Skeleton count={3} className="mb-2" />
        <div className="flex gap-2 mt-6">
          <Skeleton width={100} height={40} borderRadius={8} />
          <Skeleton width={100} height={40} borderRadius={8} />
        </div>
      </div>
    </SkeletonTheme>
  );
};

export default Skeleton;
