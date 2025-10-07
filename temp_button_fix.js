// Temporary fix for the Quick Focus Control button encoding issue

// Replace the problematic button section with this clean version:

                      <Button
                        key={participant.id}
                        size="small"
                        fullWidth
                        variant={pinnedVideo?.userId === participant.id ? "contained" : "outlined"}
                        startIcon={participant.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'}
                        onClick={() => {
                          if (pinnedVideo?.userId === participant.id) {
                            unpinVideo();
                          } else {
                            pinVideo(participant.id, participant.name, null, false);
                          }
                        }}
                        sx={{
                          justifyContent: 'flex-start',
                          fontSize: '0.75rem',
                          color: pinnedVideo?.userId === participant.id ? '#000' : 'white',
                          backgroundColor: pinnedVideo?.userId === participant.id ? '#ffc107' : 'transparent',
                          borderColor: participant.role === 'teacher' ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                          '&:hover': {
                            backgroundColor: pinnedVideo?.userId === participant.id 
                              ? '#ffb300' 
                              : 'rgba(255,255,255,0.1)',
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {participant.name}
                      </Button>