import React from 'react';
import { Editor, EditorState, Entity, CompositeDecorator, RichUtils, AtomicBlockUtils, getDefaultKeyBinding, KeyBindingUtil, convertToRaw } from 'draft-js';

import './index.css';

// Custom overrides for "code" style.
const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
  UNDERLINE: {
    textDecoration: 'none',
    borderBottom: '1px solid',
  },
};


const getBlockStyle = (block) => {
  switch (block.getType()) {
    case 'blockquote': return 'RichEditor-blockquote';
    default: return null;
  }
}


const findLinkEntities = (contentBlock, callback) => {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        Entity.get(entityKey).getType() === 'LINK'
      );
    },
    callback
  );
}

const Link = (props) => {
  const {url} = Entity.get(props.entityKey).getData();
  return (
    <a href={url} style={{color: '#3b5998', textDecoration: 'none', borderBottom: '1px solid'}}>
      {props.children}
    </a>
  );
};



const Image = (props) => {
  return (
    <div>
      <img src={props.src} alt={props.description} />
      <figcaption>{props.description}</figcaption>
    </div>
  )
}

const Video = (props) => {
  return (
    <div>
      <video controls src={props.src} style={{maxWidth: '100%'}} />
      <figcaption>{props.description}</figcaption>
    </div>
  )
}

const Media = (props) => {
  const entity = Entity.get(props.block.getEntityAt(0));
  const type = entity.getType();
  const {url, description} = entity.getData();

  switch(type) {
    case 'IMAGE': return <Image src={url} description={description} />;
    case 'VIDEO': return <Video src={url} description={description} />;
    default: return null;
  }
}


const myMediaBlockRenderer = (block) => {
  const type = block.getType();
  if (type === 'atomic') {
    return {
      component: Media,
      editable: false,
    };
  }

  return null;
}




class RichEditor extends React.Component {
  constructor(props) {
    super(props);
    const decorator = new CompositeDecorator([
      {
        strategy: findLinkEntities,
        component: Link,
      },
    ]);

    this.state = {
      editorState: EditorState.createEmpty(decorator),
      showEntityDataPrompt: false,
      entityType: '',
      entityData: {},
    };

    this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => this.setState({editorState});

    this.handleKeyCommand = (command) => this._handleKeyCommand(command);
    this.onTab = (e) => this._onTab(e);

    this.undo = () => this._undo();
    this.redo = () => this._redo();

    this.toggleBlockType = (type) => this._toggleBlockType(type);
    this.toggleInlineStyle = (style) => this._toggleInlineStyle(style);

    this.insertLink = () => this._insertLink();
    this.insertImage = () => this._insertImage();
    this.insertVideo = () => this._promptForMedia('VIDEO');
  }

  myKeyBindingFn(e) {
    if (e.keyCode === 83 /* `S` key */ && KeyBindingUtil.hasCommandModifier(e)) {
      return 'save';
    }
    return getDefaultKeyBinding(e);
  }
  _handleKeyCommand(command) {
    const {editorState} = this.state;

    if (command === 'save') {
      console.log(convertToRaw(editorState.getCurrentContent()));
    }

    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  _onTab(e) {
    const maxDepth = 4;
    this.onChange(RichUtils.onTab(e, this.state.editorState, maxDepth));
  }

  _undo () {
    const {editorState} = this.state;
    this.onChange(
      EditorState.undo(editorState)
    );
  }
  _redo () {
    const {editorState} = this.state;
    this.onChange(
      EditorState.redo(editorState)
    );
  }

  _insertLink() {
    const {editorState} = this.state;
    const entityKey = Entity.create('LINK', 'MUTABLE', {url: 'https://myanbin.github.io'});
    this.onChange(
      RichUtils.toggleLink(
        editorState,
        editorState.getSelection(),
        entityKey
      )
    );
  }

  _insertImage() {
    const {editorState} = this.state;
    const entityKey = Entity.create('IMAGE', 'IMMUTABLE', {url: 'http://placekitten.com/g/200/200', description: 'Pretty Cat'});
    this.onChange(
      AtomicBlockUtils.insertAtomicBlock(
        editorState,
        entityKey,
        ' '
      )
    )
  }
  _insertVideo() {
    const {editorState} = this.state;
    const entityKey = Entity.create('VIDEO', 'IMMUTABLE', {url: 'http://images.apple.com/media/cn/macbook-pro/2016/b4a9efaa_6fe5_4075_a9d0_8e4592d6146c/films/design/macbook-pro-design-tft-cn-20161026_1536x640h.mp4', description: 'MacBook Pro'});
    this.onChange(
      AtomicBlockUtils.insertAtomicBlock(
        editorState,
        entityKey,
        ' '
      )
    )
  }

  _insertMedia() {
    const {editorState, entityType, entityData} = this.state;
    const entityKey = Entity.create(entityType, 'IMMUTABLE', entityData);
    this.onChange(
      AtomicBlockUtils.insertAtomicBlock(
        editorState,
        entityKey,
        ' '
      )
    );
    this.setState({
      showEntityDataPrompt: false,
      entityType: '',
      entityData: {},
    });
  }

  _promptForMedia(type) {
    this.setState({
      showEntityDataPrompt: true,
      entityType: type,
      entityData: {
        url: '',
        description: '',
      },
    });
  }


  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  _toggleInlineStyle(inlineStyle) {
    console.log('change inline style: ', inlineStyle);
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }


  render() {
    const {editorState, showEntityDataPrompt, entityType, entityData} = this.state;
    const contentState = editorState.getCurrentContent();

    // If the user changes block type before entering any text, we can
    // either style the placeholder or hide it. Let's just hide it now.
    let className = 'RichEditor-editor';
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        className += ' RichEditor-hidePlaceholder';
      }
    }


    return (
      <div className="RichEditor-root">
        <div className="RichEditor-control">
          <div className="RichEditor-controls">
            <SpanButton label="Undo" onToggle={this.undo} />
            <SpanButton label="Redo" onToggle={this.redo} />
          </div>
          <InlineStyleControls
            editorState={editorState}
            onToggle={this.toggleInlineStyle}
          />
          <BlockStyleControls
            editorState={editorState}
            onToggle={this.toggleBlockType}
          />
          <div className="RichEditor-controls">
            <SpanButton label="Link" active={entityType === 'LINK'} onToggle={this.insertLink} />
            <SpanButton label="Image" active={entityType === 'IMAGE'} onToggle={this.insertImage} />
            <SpanButton label="Video" active={entityType === 'VIDEO'} onToggle={this.insertVideo} />
          </div>
        </div>
        <div className={className} onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            blockRendererFn={myMediaBlockRenderer}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.myKeyBindingFn}
            onChange={this.onChange}
            onTab={this.onTab}
            placeholder="Tell a story..."
            ref="editor"
            stripPastedStyles={true}
          />
        </div>
      </div>
    );
  }
}




class SpanButton extends React.Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    let className = 'RichEditor-styleButton';
    if (this.props.active) {
      className += ' RichEditor-activeButton';
    }

    return (
      <span className={className} onMouseDown={this.onToggle}>
        {this.props.label}
      </span>
    );
  }
}


const BLOCK_TYPES = [
  {label: 'H1', style: 'header-one'},
  {label: 'H2', style: 'header-two'},
  {label: 'H3', style: 'header-three'},
  {label: 'H4', style: 'header-four'},
  // {label: 'H5', style: 'header-five'},
  // {label: 'H6', style: 'header-six'},
  {label: 'Blockquote', style: 'blockquote'},
  {label: 'UL', style: 'unordered-list-item'},
  {label: 'OL', style: 'ordered-list-item'},
  // {label: 'Code Block', style: 'code-block'},
];

const BlockStyleControls = (props) => {
  const {editorState} = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type) =>
        <SpanButton
          key={type.label}
          active={type.style === blockType}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};

const INLINE_STYLES = [
  {label: 'Bold', style: 'BOLD'},
  {label: 'Italic', style: 'ITALIC'},
  {label: 'Underline', style: 'UNDERLINE'},
  // {label: 'Monospace', style: 'CODE'},
];

const InlineStyleControls = (props) => {
  var currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map(type =>
        <SpanButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};


export default RichEditor