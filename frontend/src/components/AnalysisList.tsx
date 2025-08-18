import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { List, Tag, Button } from "antd";
import type { AnalysisItem } from "../types/analysis";

interface Props {
  analysis: AnalysisItem[];
  currentTime: number;
  onSeek: (time: number) => void;
  selectedId?: string;
  onScrollToId?: (id: string | null) => void;
}

function parseTime(fs: string): number {
  const parts = fs.replace("[", "").replace("]", "").split(":").map(Number);
  if (parts.length === 3) {
    // [hh:mm:ss]
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // [mm:ss]
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

const typeColor = {
  affirmation: "green",
  definition: "blue",
  attack: "red",
  defence: "orange",
  example: "pink"
};

const AnalysisList = forwardRef<any, Props>(({ analysis, currentTime, onSeek, selectedId, onScrollToId }, ref) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLLIElement>(null);

  // 只显示当前时间之前的内容（如果currentTime为0则显示全部）
  const visible = currentTime === 0 ? analysis : analysis.filter(item => parseTime(item.global_fs) <= currentTime);

  // 自动滚动到选中项
  useEffect(() => {
    if (selectedId && selectedItemRef.current && listRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedId]);

  // 暴露scrollToId方法
  useImperativeHandle(ref, () => ({
    scrollToId: (id: string) => {
      const li = listRef.current?.querySelector(`li[data-analysis-id="${id}"]`);
      if (li) {
        (li as HTMLLIElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }));

  return (
    <div ref={listRef} style={{ 
      height: '100%', 
      overflow: 'auto',
      paddingRight: '4px' // 为滚动条留出空间
    }}>
      <List
        itemLayout="horizontal"
        dataSource={visible}
        style={{ padding: 0 }}
        renderItem={item => {
          const isSelected = selectedId === item.analysis_id;
          return (
            <List.Item
              ref={undefined}
              data-analysis-id={item.analysis_id}
              style={{
                backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
                borderRadius: 8,
                marginBottom: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: '12px 16px'
              }}
              onClick={() => onScrollToId?.(item.analysis_id)}
              actions={[
                <Button 
                  size="small" 
                  type="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(parseTime(item.global_fs));
                  }}
                  style={{
                    borderRadius: 6,
                    fontSize: '12px',
                    height: '24px',
                    padding: '0 8px'
                  }}
                >
                  跳转
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 4
                  }}>
                    <Tag color={typeColor[item.analysis_type]} style={{ margin: 0 }}>
                      {item.analysis_type}
                    </Tag>
                    <span style={{ fontWeight: 'bold', color: '#333' }}>
                      {item.speaker}
                    </span>
                    <span style={{ color: "#888", fontSize: '12px' }}>
                      {item.global_fs}
                    </span>
                  </div>
                }
                description={
                  <div>
                    {item.technique && (
                      <div style={{ 
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#1890ff',
                        fontWeight: 'bold'
                      }}>
                        手法: {item.technique}
                      </div>
                    )}
                    <div style={{ 
                      color: '#666', 
                      lineHeight: '1.5',
                      fontSize: '14px',
                      maxHeight: '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {item.content}
                    </div>
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
});

export default AnalysisList;