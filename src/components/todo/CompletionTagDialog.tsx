export function CompletionTagDialog({
  action,
  todoTitle,
  onClose,
  onConfirm
}: {
  action: '完成' | '打卡';
  todoTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="completion-dialog-backdrop" role="presentation">
      <section className="completion-dialog" role="alertdialog" aria-modal="true" aria-labelledby="completion-dialog-title">
        <h2 id="completion-dialog-title">{action}前请选择类型标签</h2>
        <p>“{todoTitle}”尚未标注类型，无法{action === '完成' ? '标记为已完成' : '记录今日打卡'}。</p>
        <div className="completion-dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            取消
          </button>
          <button type="button" onClick={onConfirm} autoFocus>
            前往添加标签
          </button>
        </div>
      </section>
    </div>
  );
}
