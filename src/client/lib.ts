export const playBoxEmote = (): void => {
  emit("playemote", "box")
}

export const clearBoxEmote = (): void => {
  emit("cancelemote")
}