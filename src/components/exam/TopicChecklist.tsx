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
        <Text className="text-on-surface-variant text-sm text-center py-4">
          No topics yet — generate a pack or add your own.
        </Text>
      )}

      {topics.map((item, index) => (
        <View
          key={item.id}
          style={{
            borderBottomWidth: index < topics.length - 1 ? 1 : 0,
            borderBottomColor: 'rgba(73,69,81,0.4)',
          }}
        >
          {editingId === item.id ? (
            /* ── Edit mode ── */
            <View className="flex-row items-center py-2 gap-2">
              <TextInput
                value={editText}
                onChangeText={setEditText}
                autoFocus
                className="flex-1 text-on-surface font-inter text-sm bg-surface-container border border-primary rounded-lg px-3 py-2"
                style={{ fontSize: 14 }}
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
            /* ── Normal row ── */
            <View className="flex-row items-center py-3">
              {/* Checkbox */}
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

              {/* Title */}
              <Text
                className="flex-1 font-inter text-sm"
                style={{
                  color: item.completed ? '#494551' : '#dce1ff',
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                }}
              >
                {item.title}
              </Text>

              {/* Yield badge */}
              <View
                style={{
                  paddingHorizontal: 6, paddingVertical: 2,
                  borderRadius: 999, marginLeft: 6,
                  backgroundColor: `${yieldColor(item.yield)}22`,
                }}
              >
                <Text style={{ fontSize: 10, color: yieldColor(item.yield), fontWeight: '600' }}>
                  {item.yield?.toUpperCase()}
                </Text>
              </View>

              {/* Edit button */}
              <TouchableOpacity
                onPress={() => handleStartEdit(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="pencil-outline" size={15} color="#948e9d" />
              </TouchableOpacity>

              {/* Delete button */}
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.title)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="trash-outline" size={15} color="#ff4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {/* Add new topic */}
      {showAddInput ? (
        <View className="flex-row items-center pt-3 gap-2">
          <TextInput
            value={newTopicText}
            onChangeText={setNewTopicText}
            placeholder="e.g. Brachial Plexus..."
            placeholderTextColor="#494551"
            autoFocus
            className="flex-1 text-on-surface font-inter text-sm bg-surface-container border border-outline-variant rounded-lg px-3 py-2"
            style={{ fontSize: 14 }}
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
          className="flex-row items-center pt-3 mt-1"
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color="#cfbcff" />
          <Text className="text-primary font-inter-medium text-sm ml-2">Add topic</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
