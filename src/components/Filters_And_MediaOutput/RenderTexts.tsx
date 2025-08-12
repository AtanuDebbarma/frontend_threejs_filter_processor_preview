import {appStore} from '../../store/appStore';

export const RenderTexts = ({mediaIndex}: {mediaIndex: number}) => {
  const texts = appStore(state => state.texts);
  const updateTextContent = appStore(state => state.updateTextContent);
  const removeText = appStore(state => state.removeText);

  // Filter texts belonging to the given media
  const textsForMedia = texts.filter(t => t.mediaIndex === mediaIndex);

  // Sort texts by zIndex ascending (optional)
  textsForMedia.sort((a, b) => (a.zIndex ?? 15) - (b.zIndex ?? 15));

  return textsForMedia.map((textItem, idx) => (
    <div
      dir="rtl"
      key={textItem.id}
      contentEditable
      suppressContentEditableWarning
      className="bg-opacity-60 absolute rounded-lg bg-black px-4 py-2 font-bold outline-none"
      style={{
        top: textItem.y ?? 50,
        left: textItem.x ?? 50,
        zIndex: (textItem.zIndex ?? 15) + idx * 2, // dynamic zIndex to avoid overlaps
        fontSize: textItem.fontSize ?? 24,
        fontWeight: textItem.fontWeight ?? 700,
        color: textItem.textColor ?? '#fff',
        backgroundColor: textItem.backGroundColor ?? 'rgba(0,0,0,1)',
        fontFamily: textItem.fontFamily || 'Arial',
        userSelect: 'text',
        cursor: 'text',
        position: 'absolute',
        transform: `rotate(${textItem.rotation ?? 0}deg)`,
        minWidth: 'fit-content',
        maxWidth: '90%',
        wordBreak: 'break-word',
        direction: 'rtl',
      }}
      onClick={e => e.stopPropagation()} // prevent closing menus
      onInput={e => {
        const newContent = (e.currentTarget.textContent || '').trim();
        updateTextContent(textItem.id, newContent);
      }}
      onBlur={e => {
        const currentContent = (e.currentTarget.textContent || '').trim();
        // Remove text overlay if empty on blur
        if (currentContent.length === 0) {
          removeText(textItem.id);
        }
      }}
      spellCheck={false}>
      {textItem.content}
    </div>
  ));
};
