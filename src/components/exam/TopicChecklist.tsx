import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Topic } from '../../types';

interface TopicChecklistProps {
  topics: Topic[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export const TopicChecklist: React.FC<TopicChecklistProps> = ({
  topics,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newTopicText, setNewTopicText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const handleStartEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setEditText(topic.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      onEdit(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const handleAdd = () => {
    if (newTopicText.trim()) {
      onAdd(newTopicText.trim());
      setNewTopicText('');
      setShowAddInput(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Topic', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  };

  const yieldColor = (y: string) => {
    if (y === 'high') return '#cfbcff';
    if (y === 'medium') return '#948e9d';
    return '#494551';
  };

  return (
    <View>
      {topics.length === 0 && !showAddInput && (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d', textAlign: 'center', paddingVertical: 20 }}>
          No topics yet — generate a pack or add your own.
        </Text>
      )}

      {topics.map((item, index) => (
        <View
          key={item.id}
          style={{
            borderBottomWidth: index < topics.length - 1 ? 1 : 0,
            borderBottomColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {editingId === item.id ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 }}>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                autoFocus
                style={{
                  flex: 1,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: '#e1e3e4',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(207,188,255,0.3)',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
                onSubmitEditing={handleSaveEdit}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleSaveEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="checkmark-circle" size={22} color="#cfbcff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setEditingId(null); setEditText(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={22} color="#948e9d" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
              <TouchableOpacity
                onPress={() => onToggle(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={{
                  width: 22, height: 22, borderRadius: 6, marginRight: 10,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: item.completed ? '#cfbcff' : 'transparent',
                  borderWidth: 2,
                  borderColor: item.completed ? '#cfbcff' : '#494551',
                }}
              >
                {item.completed && (
                  <Ionicons name="checkmark" size={13} color="#39197c" />
                )}
              </TouchableOpacity>

              <Text
                style={{
                  flex: 1,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  lineHeight: 20,
                  color: item.completed ? '#494551' : '#c8cdd0',
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                }}
              >
                {item.title}
              </Text>

              <View style={{
                paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                backgroundColor: `${yieldColor(item.yield)}18`, marginLeft: 6,
              }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: yieldColor(item.yield), letterSpacing: 0.8 }}>
                  {item.yield?.toUpperCase()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleStartEdit(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                style={{ marginLeft: 10 }}
              >
                <Ionicons name="pencil-outline" size={15} color="#494551" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.title)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="trash-outline" size={15} color="rgba(255,100,100,0.5)" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {showAddInput ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, gap: 8 }}>
          <TextInput
            value={newTopicText}
            onChangeText={setNewTopicText}
            placeholder="e.g. Brachial Plexus..."
            placeholderTextColor="#494551"
            autoFocus
            style={{
              flex: 1,
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: '#e1e3e4',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
            <Ionicons name="checkmark-circle" size={22} color="#cfbcff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowAddInput(false); setNewTopicText(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Ionicons name="close-circle" size={22} color="#948e9d" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowAddInput(true)}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14, marginTop: 2 }}
        >
          <Ionicons name="add-circle-outline" size={18} color="#cfbcff" />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#cfbcff', marginLeft: 8 }}>
            Add topic
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
