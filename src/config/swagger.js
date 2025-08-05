
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Glow API Documentation',
      version: '1.0.0',
      description: 'Glow sosial kəşf tətbiqinin rəsmi API sənədləri',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      },
    ],
    // BÜTÜN ENDPOINTLƏR ARTIQ BİRBAŞA BURADA TƏYİN OLUNUR
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Serverin işlək vəziyyətini yoxlayır',
          responses: { '200': { description: 'Server işləkdir' } }
        }
      },
      // Auth Paths
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Yeni istifadəçi qeydiyyatı',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterUserInput' }
              }
            }
          },
          responses: {
            '201': { description: 'İstifadəçi uğurla yaradıldı' },
            '409': {
              description: 'Bu email artıq mövcuddur',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sistemə daxil olmaq',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginUserInput' } } }
          },
          responses: {
            '200': { description: 'Uğurlu giriş' },
            '401': { description: 'Email və ya şifrə yanlışdır' },
            '429': { description: 'Çox sayda cəhd edildi' }
          }
        }
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Hazırkı istifadəçini sistemdən çıxarır',
          description: 'Bu endpoint istifadəçinin aktiv sessiyasını (əgər varsa) silir. Client tərəfi isə JWT tokeni yaddaşdan silməlidir.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Uğurlu çıxış' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/auth/google': {
        post: {
          tags: ['Auth'],
          summary: 'Google ID Token ilə qeydiyyatdan keçir və ya daxil olur',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GoogleLoginInput'
                }
              }
            }
          },
          responses: {
            '200': { description: 'Uğurlu giriş və ya qeydiyyat' },
            '401': { description: 'Google tokeni etibarsızdır' }
          }
        }
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Hazırkı istifadəçinin profil məlumatlarını gətirir',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'İstifadəçi məlumatları uğurla qaytarıldı' },
            '401': { description: 'Token təqdim edilməyib' }
          }
        }
      },
      '/api/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Şifrə bərpası üçün OTP kodu göndərir',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordInput' } } }
          },
          responses: { '200': { description: 'Sorğu qəbul edildi' } }
        }
      },
      '/api/auth/verify-otp': {
        post: {
          tags: ['Auth'],
          summary: 'Göndərilən OTP kodunu yoxlayır',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOtpInput' } } }
          },
          responses: {
            '200': { description: 'Kod uğurla təsdiqləndi' },
            '400': { description: 'Kod yanlışdır və ya vaxtı bitib' }
          }
        }
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'OTP təsdiqləndikdən sonra yeni şifrəni təyin edir',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordInput' } } }
          },
          responses: {
            '200': { description: 'Şifrə uğurla yeniləndi' },
            '400': { description: 'Kod yanlışdır və ya vaxtı bitib' }
          }
        }
      },
      '/api/auth/me/initiate-email-change': {
        post: {
          tags: ['Auth'],
          summary: 'E-poçt dəyişikliyi prosesini başlayır və yeni ünvana OTP göndərir',
          description: "İstifadəçi yeni e-poçt ünvanını göndərir. Sistem həmin e-poçtun istifadədə olub-olmadığını yoxlayır və əgər boşdursa, təsdiq üçün OTP kodu göndərir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    newEmail: {
                      type: 'string',
                      format: 'email',
                      example: 'yeni.email@example.com'
                    }
                  },
                  required: ['newEmail']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Təsdiq kodu yeni e-poçt ünvanınıza göndərildi' },
            '401': { description: 'Avtorizasiya xətası' },
            '409': { description: 'Bu e-poçt ünvanı artıq istifadə olunur' }
          }
        }
      },
      '/api/auth/me/confirm-email-change': {
        post: {
          tags: ['Auth'],
          summary: 'OTP ilə e-poçt dəyişikliyini təsdiqləyir',
          description: "İstifadəçi yeni e-poçtuna gələn OTP kodunu bu endpoint-ə göndərərək dəyişikliyi təsdiqləyir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    otp: {
                      type: 'string',
                      example: '123456'
                    }
                  },
                  required: ['otp']
                }
              }
            }
          },
          responses: {
            '200': { description: 'E-poçt ünvanınız uğurla yeniləndi' },
            '400': { description: 'Təsdiq kodu yanlışdır və ya vaxtı bitib' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      // Profile Paths
      '/api/profile/me': {
        patch: {
          tags: ['Profile'],
          summary: 'Hazırkı istifadəçinin profilini yeniləyir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateProfileInput' }
              }
            }
          },
          responses: {
            '200': { description: 'Profil uğurla yeniləndi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/profile/me/status': {
        patch: {
          tags: ['Profile'],
          summary: 'Hazırkı istifadəçinin 24 saatlıq statusunu təyin edir və ya təmizləyir',
          description: "İstifadəçi öz anlıq niyyətini bildirmək üçün status təyin edə bilər. Status 24 saat aktiv qalır. Status mətni boş göndərilərsə, mövcud status silinir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      description: "İstifadəçinin yeni status mətni. Boş göndərilərsə status silinər.",
                      example: 'Bu axşamki konsert üçün buradayam!'
                    }
                    // DƏYİŞİKLİK: durationInHours sahəsi buradan silindi
                  },
                  required: ['status'] // Yalnız status məcburidir
                }
              }
            }
          },
          responses: {
            '200': { description: 'Status uğurla yeniləndi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/profile/me/preferences': {
        patch: {
          tags: ['Profile'],
          summary: 'İstifadəçinin kəşfiyyat filteri seçimlərini yadda saxlayır',
          description: "Bu endpoint, istifadəçinin Kompas üçün standart filterlərini (məsələn, yaş aralığı) təyin etməsi üçün istifadə olunur.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    preferredMinAge: { type: 'integer', example: 22 },
                    preferredMaxAge: { type: 'integer', example: 30 },
                    notifyOnNewSignal: { type: 'boolean', example: true },
                    notifyOnNewMatch: { type: 'boolean', example: true },
                    notifyOnNewMessage: { type: 'boolean', example: false }
                  },
                }
              }
            }
          },
          responses: {
            '200': { description: 'Seçimlər uğurla yadda saxlanıldı' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/profile/me/photos': {
        post: {
          tags: ['Profile'],
          summary: 'Hazırkı istifadəçinin profilinə yeni şəkillər yükləyir (maksimum 2 ədəd)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              // Fayl yükləmələri üçün bu format istifadə olunur
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    // router-də təyin etdiyimiz ad ("photos") ilə eyni olmalıdır
                    photos: {
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'binary' // Bu, fayl olduğunu bildirir
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Şəkillər uğurla yükləndi' },
            '400': { description: 'Heç bir fayl yüklənmədi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/profile/me/photos/{photoId}': {
        delete: {
          tags: ['Profile'],
          summary: 'Hazırkı istifadəçinin profilindən bir şəkli silir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'photoId',
            in: 'path',
            required: true,
            description: 'Silinəcək şəkilin ID-si',
            schema: { type: 'integer' }
          }],
          responses: {
            '200': { description: 'Şəkil uğurla silindi' },
            '401': { description: 'Avtorizasiya xətası' },
            '404': { description: 'Şəkil tapılmadı və ya bu şəkli silməyə icazəniz yoxdur' }
          }
        }
      },
      '/api/profile/me/photos/{photoId}/main': {
        patch: {
          tags: ['Profile'],
          summary: 'Seçilmiş bir şəkli əsas profil şəkli təyin edir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'photoId',
            in: 'path',
            required: true,
            description: 'Əsas təyin ediləcək şəkilin ID-si',
            schema: { type: 'integer' }
          }],
          responses: {
            '200': { description: 'Əsas şəkil uğurla dəyişdirildi' },
            '401': { description: 'Avtorizasiya xətası' },
            '404': { description: 'Şəkil tapılmadı və ya bu əməliyyata icazəniz yoxdur' }
          }
        }
      },
      '/api/profile/me/views': {
        get: {
          tags: ['Profile', 'Premium'],
          summary: 'PREMIUM: Mənim profilimə baxanların siyahısını gətirir.Premium istifadəçilər üçün',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Profilə baxanların siyahısı' },
            '401': { description: 'Avtorizasiya xətası' },
            '403': { description: 'Premium abunəlik tələb olunur' }
          }
        }
      },
      '/api/profile/me/request-verification': {
        post: {
          tags: ['Profile'],
          summary: 'Profilin təsdiqlənməsi üçün şəkil ilə sorğu göndərir',
          description: "İstifadəçi, tətbiqin təyin etdiyi xüsusi bir pozada çəkilmiş şəkli bu endpoint-ə göndərərək profilinin təsdiqlənməsini istəyir. Uğurlu sorğudan sonra status 'PENDING' olaraq dəyişir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    verificationPhoto: {
                      type: 'string',
                      format: 'binary',
                      description: 'Təsdiqləmə üçün tələb olunan xüsusi pozada çəkilmiş şəkil'
                    }
                  },
                  required: ['verificationPhoto']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Verifikasiya sorğunuz uğurla göndərildi' },
            '400': { description: 'Şəkil yüklənmədi və ya artıq təsdiqlənmiş/gözləmədə olan sorğunuz var' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      //Purchese Paths
      '/api/purchase/daily-premium': {
        post: {
          tags: ['Premium'],
          summary: 'Gündəlik (24 saatlıq) premium statusunu aktivləşdirir',
          description: 'Mobil tətbiq, istifadəçi gündəlik premiumu aldıqdan sonra Apple/Google-dan aldığı qəbzi (receipt) bu endpoint-ə göndərir.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    receipt: { type: 'string', example: 'store_receipt_data_here' }
                  },
                  required: ['receipt']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Gündəlik premium uğurla aktivləşdirildi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },

      '/api/interest': {
        get: {
          tags: ['Interest'],
          summary: 'Bütün mövcud maraqları kateqoriyalara bölünmüş şəkildə gətirir',
          responses: {
            '200': { description: 'Maraqların siyahısı uğurla qaytarıldı' }
          }
        }
      },

      '/api/location/check-in': {
        post: {
          tags: ['Location'],
          summary: 'Ağıllı Check-in: İstifadəçini məkana daxil edir və ya seçim təklif edir',
          description: "Bu endpoint istifadəçinin koordinatlarına əsasən yaxınlıqdakı məkanları axtarır. Əgər 1 məkan tapılarsa, avtomatik check-in edir. Birdən çox məkan tapılarsa, seçim üçün onların siyahısını qaytarır.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  // DÜZƏLİŞ BURADADIR
                  type: 'object',
                  properties: {
                    latitude: {
                      type: 'number',
                      example: 40.3777
                    },
                    longitude: {
                      type: 'number',
                      example: 49.8344
                    }
                  },
                  required: ['latitude', 'longitude']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Sorğu uğurlu oldu. Cavabın `status` sahəsinə baxın.',
              content: {
                'application/json': {
                  examples: {
                    'Single Venue Found (Checked-in)': {
                      value: {
                        status: 'CHECKED_IN',
                        message: "Siz uğurla 'Second Cup'-a daxil oldunuz!",
                        data: { /* ... ActiveSession obyekti ... */ }
                      }
                    },
                    'Multiple Venues Found (Selection needed)': {
                      value: {
                        status: 'MULTIPLE_OPTIONS',
                        message: "Yaxınlığınızda bir neçə məkan tapıldı. Zəhmət olmasa, birini seçin.",
                        data: [{ id: 1, name: "Second Cup" }, { id: 2, name: "Coffee Moffie" }]
                      }
                    }
                  }
                }
              }
            },
            '404': { description: 'Yaxınlıqda heç bir məkan tapılmadı' }
          }
        }
      },
      '/api/location/check-in/finalize': {
        post: {
          tags: ['Location'],
          summary: 'İstifadəçinin seçdiyi məkan ilə check-in prosesini tamamlayır',
          description: "'Ağıllı Check-in' sorğusu 'MULTIPLE_OPTIONS' statusu qaytardıqda, istifadəçinin seçdiyi məkanın ID-si bu endpoint-ə göndərilir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    venueId: { type: 'integer', example: 1 }
                  },
                  required: ['venueId']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Check-in uğurla tamamlandı' },
            '400': { description: 'venueId təqdim edilməyib' }
          }
        }
      },
      '/api/location/seed': {
        post: {
          tags: ['Location'],
          summary: '(Yalnız Test Üçün) Databazanı ilkin məkanlarla doldurur',
          responses: {
            '201': { description: 'Databaza uğurla dolduruldu' }
          }
        }
      },
      '/api/location/incognito': {
        patch: {
          tags: ['Location'], // <--- "Premium" teqi silindi
          summary: 'Görünməz rejimi aktiv və ya deaktiv edir', // <--- "PREMIUM:" yazısı silindi
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'boolean',
                      description: 'true = aktiv, false = deaktiv',
                      example: true
                    }
                  },
                  required: ['status']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Status uğurla dəyişdirildi' },
            '400': { description: 'Check-in edilməyib və ya status səhvdir' },
            '401': { description: 'Avtorizasiya xətası' } // <--- 403 cavabı silindi
          }
        }
      },
      '/api/location/venues/{id}/stats': {
        get: {
          tags: ['Location'],
          summary: 'Bir məkana aid statistik məlumatları gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Statistik məlumatlar' } }
        }
      },
      '/api/location/venues/{id}/live-stats': {
        get: {
          tags: ['Location', 'Premium'],
          summary: 'PREMIUM: Bir məkanın real-zamanlı (canlı) statistik məlumatlarını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': {
              description: 'Canlı statistik məlumatlar',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      userCount: { type: 'integer', example: 12 },
                      genderRatio: { type: 'object', properties: { male: { type: 'integer' }, female: { type: 'integer' } }, example: { male: 60, female: 40 } },
                      ageRange: { type: 'string', example: '22-28' }
                    }
                  }
                }
              }
            },
            '403': { description: 'Premium abunəlik tələb olunur' },
            '404': { description: 'Məkan tapılmadı' }
          }
        }
      },
      '/api/chat/{connectionId}/messages': {
        get: {
          tags: ['Chat'],
          summary: 'Bir bağlantıya aid bütün söhbət tarixçəsini gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            {
              name: 'connectionId',
              in: 'path',
              required: true,
              description: 'Mesajlarını görmək istədiyiniz bağlantının ID-si',
              schema: {
                type: 'integer'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Mesajların siyahısı uğurla qaytarıldı',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Message'
                    }
                  }
                }
              }
            },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/chat/messages/{id}/report': {
        post: {
          tags: ['Chat'],
          summary: 'Bir mesajı şikayət edir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportUserInput' } } }
          },
          responses: { '200': { description: 'Mesaj uğurla şikayət olundu' } }
        }
      },
      '/api/chat/group-messages/{id}/report': {
        post: {
          tags: ['Chat'],
          summary: 'Bir qrup mesajını şikayət edir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            description: 'Şikayət ediləcək qrup mesajının ID-si',
            schema: { type: 'integer' }
          }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reason: {
                      type: 'string',
                      example: 'Təhqiramiz məzmun'
                    }
                  },
                  required: ['reason']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Qrup mesajı uğurla şikayət olundu' },
            '401': { description: 'Avtorizasiya xətası' },
            '404': { description: 'Mesaj tapılmadı' }
          }
        }
      },
      '/api/chat/messages/{id}': {
        delete: {
          tags: ['Chat'],
          summary: 'Hazırkı istifadəçinin özünə aid bir mesajı silir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            description: 'Silinəcək mesajın ID-si',
            schema: { type: 'integer' }
          }],
          responses: {
            '200': { description: 'Mesaj uğurla silindi' },
            '401': { description: 'Avtorizasiya xətası' },
            '403': { description: 'Bu mesajı silməyə icazəniz yoxdur' },
            '404': { description: 'Mesaj tapılmadı' }
          }
        }
      },
      '/api/chat/group/upload-image': {
        post: {
          tags: ['Chat'],
          summary: 'Qrup söhbəti üçün şəkil faylı yükləyir',
          description: "Bu endpoint, istifadəçinin qrup söhbətinə göndərmək istədiyi şəkli Cloudinary-ə yükləyir və təhlükəsiz URL-i geri qaytarır. Bu URL daha sonra WebSocket vasitəsilə mesaj olaraq göndərilir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    // router faylında təyin etdiyimiz adla eyni olmalıdır
                    groupChatImage: {
                      type: 'string',
                      format: 'binary',
                      description: 'Şəkil faylı (jpg, png, etc.)'
                    }
                  },
                  required: ['groupChatImage']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Fayl uğurla yükləndi və URL qaytarıldı' },
            '400': { description: 'Heç bir fayl yüklənmədi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/chat/group/upload-video': {
        post: {
          tags: ['Chat'],
          summary: 'Qrup söhbəti üçün video not faylı yükləyir',
          description: "Bu endpoint, istifadəçinin qrup söhbətinə göndərmək istədiyi qısa video faylını Cloudinary-ə yükləyir və təhlükəsiz URL-i geri qaytarır.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    // router faylında təyin etdiyimiz adla eyni olmalıdır
                    groupChatImage: {
                      type: 'string',
                      format: 'binary',
                      description: 'Video faylı (mp4, etc.)'
                    }
                  },
                  required: ['groupChatVideo']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Fayl uğurla yükləndi və URL qaytarıldı' },
            '400': { description: 'Heç bir fayl yüklənmədi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/chat/group/upload-audio': {
        post: {
          tags: ['Chat'],
          summary: 'Qrup söhbəti üçün səs faylı yükləyir',
          description: "Bu endpoint, istifadəçinin qrup söhbətinə göndərmək istədiyi səs faylını Cloudinary-ə yükləyir və təhlükəsiz URL-i geri qaytarır.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    // router faylında təyin etdiyimiz adla eyni olmalıdır
                    groupChatAudio: {
                      type: 'string',
                      format: 'binary',
                      description: 'Səs faylı (mp3, m4a, etc.)'
                    }
                  },
                  required: ['groupChatAudio']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Fayl uğurla yükləndi və URL qaytarıldı' },
            '400': { description: 'Heç bir fayl yüklənmədi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/chat/upload-audio': {
        post: {
          tags: ['Chat'],
          summary: 'Söhbət üçün səsli mesaj faylı yükləyir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    chatAudio: {
                      type: 'string',
                      format: 'binary',
                      description: 'Səs faylı (məsələn, .mp3, .m4a)'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Fayl uğurla yükləndi və URL qaytarıldı' },
            '400': { description: 'Heç bir fayl yüklənmədi' }
          }
        }
      },
      '/api/chat/icebreakers': {
        get: {
          tags: ['Chat'],
          summary: 'Söhbətə başlamaq üçün təsadüfi "Buz Sındıran" sualları gətirir',
          description: 'Bu endpoint, adətən yeni bir bağlantı ("match") yarandıqda və söhbət pəncərəsi ilk dəfə açıldıqda istifadə olunur. Təsadüfi 3 sual qaytarır.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Təsadüfi sualların siyahısı uğurla qaytarıldı',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 1 },
                        text: { type: 'string', example: 'Əgər bir super gücün olsaydı, nə olardı?' }
                      }
                    }
                  }
                }
              }
            },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/chat/venue/{venueId}/messages': {
        get: {
          tags: ['Chat'],
          summary: 'Məkana aid qrup söhbətinin son mesajlarını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'venueId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }],
          responses: {
            '200': { description: 'Mesajların siyahısı uğurla qaytarıldı' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/notification': {
        get: {
          tags: ['Notification'],
          summary: 'Hazırkı istifadəçinin bütün bildirişlərini gətirir (səhifələmə ilə)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Gətiriləcək səhifənin nömrəsi',
              schema: { type: 'integer', default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Hər səhifədə göstəriləcək bildiriş sayı',
              schema: { type: 'integer', default: 20 }
            }
          ],
          responses: { '200': { description: 'Bildirişlərin səhifələnmiş siyahısı' } }
        }
      },
      '/api/notification/{id}/read': {
        patch: {
          tags: ['Notification'],
          summary: 'Bir bildirişi "oxunmuş" kimi işarələyir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }],
          responses: {
            '200': { description: 'Bildiriş uğurla yeniləndi' },
            '404': { description: 'Bildiriş tapılmadı' }
          }
        }
      },
      '/api/notification/register-device': {
        post: {
          tags: ['Notification'],
          summary: 'İstifadəçinin cihazını push bildirişlər üçün qeydiyyatdan keçirir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegisterDeviceInput'
                }
              }
            }
          },
          responses: {
            '200': { description: 'Cihaz uğurla qeydiyyatdan keçdi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/{id}/block': {
        post: {
          tags: ['User'],
          summary: 'Bir istifadəçini bloklayır',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Bloklanacaq istifadəçinin ID-si (UUID formatında)',
              schema: {
                type: 'string',
                format: 'uuid'
              }
            }
          ],
          responses: {
            '200': { description: 'İstifadəçi uğurla bloklandı' },
            '401': { description: 'Avtorizasiya xətası' },
            '404': { description: 'Bloklanacaq istifadəçi tapılmadı' }
          }
        }
      },
      '/api/users/blocked': {
        get: {
          tags: ['User'],
          summary: 'Hazırkı istifadəçinin blokladığı bütün şəxslərin siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: {
            '200': { description: 'Bloklanmış istifadəçilərin siyahısı' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/{id}/unblock': {
        delete: {
          tags: ['User'],
          summary: 'Bir istifadəçini blokdan çıxarır',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Blokdan çıxarılacaq istifadəçinin ID-si',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': { description: 'İstifadəçi uğurla blokdan çıxarıldı' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/{id}/report': {
        post: {
          tags: ['User'],
          summary: 'Bir istifadəçini şikayət edir',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Şikayət olunacaq istifadəçinin ID-si (UUID formatında)',
              schema: {
                type: 'string',
                format: 'uuid'
              }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ReportUserInput'
                }
              }
            }
          },
          responses: {
            '200': { description: 'Şikayət uğurla göndərildi' },
            '400': { description: 'Səbəb göstərilməyib' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/{id}/profile': {
        get: {
          tags: ['User', 'Premium'],
          summary: 'Bir istifadəçinin profilini gətirir və bu baxışı qeydə alır.Premium istifadəçilər üçün',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }],
          responses: {
            '200': { description: 'İstifadəçinin profili' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/me': {
        delete: {
          tags: ['User'],
          summary: 'OTP ilə təsdiqləyərək hazırkı istifadəçinin hesabını silir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    otp: {
                      type: 'string',
                      example: '123456'
                    }
                  },
                  required: ['otp']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Hesab uğurla silindi' },
            '400': { description: 'OTP kodu yanlışdır və ya vaxtı bitib' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/me/history': {
        get: {
          tags: ['User'],
          summary: 'Hazırkı istifadəçinin son check-in tarixçəsini gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Check-in tarixçəsi' } }
        },
        delete: {
          tags: ['User'],
          summary: 'Hazırkı istifadəçinin bütün check-in tarixçəsini silir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Tarixçə uğurla silindi' } }
        }
      },
      '/api/users/me/initiate-deletion': {
        post: {
          tags: ['User'],
          summary: 'Hesabın silinməsi prosesini başlayır və e-poçta OTP göndərir',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Təsdiq kodu e-poçt ünvanınıza göndərildi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/users/{userId}/badges': {
        get: {
          tags: ['Gamification'],
          summary: 'Bir istifadəçinin qazandığı bütün nişanların siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          responses: {
            '200': { description: 'Nişanların siyahısı' }
          }
        }
      },
      '/api/rewards/grant': {
        post: {
          tags: ['User Actions'], // Yeni bir teq yarada bilərik
          summary: 'İstifadəçiyə izlədiyi mükafatlı reklama görə bonus verir',
          description: "Mobil tətbiq, istifadəçi reklamı uğurla izlədikdən sonra bu endpoint-i çağırır. Məsələn, 'EXTRA_SIGNALS_5' növü üçün 5 siqnal krediti verir.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rewardType: {
                      type: 'string',
                      example: 'EXTRA_SIGNALS_5'
                    }
                  },
                  required: ['rewardType']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Mükafat uğurla hesabınıza əlavə edildi' },
            '400': { description: 'Bilinməyən mükafat növü' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/connections': {
        get: {
          tags: ['Connection'],
          summary: 'Hazırkı istifadəçinin bütün bağlantılarının siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: {
            '200': { description: 'Bağlantıların siyahısı' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/connections/{id}': {
        delete: {
          tags: ['Connection'],
          summary: 'Bir bağlantını (match) silir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            description: 'Silinəcək bağlantının ID-si',
            schema: { type: 'integer' }
          }],
          responses: {
            '200': { description: 'Bağlantı uğurla silindi' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },
      '/api/feedback': {
        post: {
          tags: ['Feedback'],
          summary: 'İstifadəçidən yeni bir rəy (feedback) qəbul edir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    description: {
                      type: 'string',
                      description: 'Rəyin mətni',
                      example: 'Salam, profili yeniləyəndə xəta baş verir.'
                    },
                    screenshot: {
                      type: 'string',
                      format: 'binary',
                      description: 'Problemi göstərən ekran görüntüsü (opsional)'
                    }
                  },
                  required: ['description']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Rəy uğurla qəbul edildi' },
            '400': { description: 'Açıqlama sahəsi boşdur' },
            '401': { description: 'Avtorizasiya xətası' }
          }
        }
      },

      '/api/admin/stats': {
        get: {
          tags: ['Admin'],
          summary: 'Admin paneli üçün əsas statistik məlumatları gətirir',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Statistik məlumatlar uğurla qaytarıldı',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DashboardStats' }
                }
              }
            },
            '403': { description: 'İcazə yoxdur' }
          }
        }
      },
      '/api/admin/stats/summary': {
        get: {
          tags: ['Admin - Statistics'],
          summary: 'Admin paneli üçün əsas statistik göstəriciləri gətirir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/stats/usage-over-time': {
        get: {
          tags: ['Admin - Statistics'],
          summary: 'Son 30 günün istifadəçi qeydiyyatı statistikasını gətirir (qrafik üçün)',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/stats/popular-venues': {
        get: {
          tags: ['Admin - Statistics'],
          summary: 'Ən populyar (ən çox check-in olan) 10 məkanı gətirir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'İstifadəçilərin siyahısını gətirir (filterləmə imkanı ilə)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Ad və ya email ilə axtarış' },
            { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Səhifə nömrəsi' },
            { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Hər səhifədəki element sayı' },
            // === YENİ PARAMETR ===
            {
              name: 'isActive',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'İstifadəçiləri aktivlik statusuna görə filtrlə (true/false)'
            },
          ],
          responses: { '200': { description: 'İstifadəçilərin siyahısı' } }
        }
      },
      '/api/admin/users/search': {
        get: {
          tags: ['Admin'],
          summary: 'Bütün istifadəçilərin siyahısını gətirir (səhifələmə ilə)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Ad və ya email ilə axtarış' },
            { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Səhifə nömrəsi' },
            { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Hər səhifədəki element sayı' },
          ],
          responses: { '200': { description: 'İstifadəçilərin siyahısı' } }
        }
      },
      '/api/admin/users/{id}/role': {
        patch: {
          tags: ['Admin'],
          summary: 'İstifadəçinin rolunu dəyişir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { roleId: { type: 'integer', example: 1 } } } } }
          },
          responses: { '200': { description: 'Rol uğurla dəyişdirildi' } }
        }
      },
      '/api/admin/users/{id}/status': {
        patch: {
          tags: ['Admin'],
          summary: 'İstifadəçinin statusunu (aktiv/ban) dəyişir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { isActive: { type: 'boolean', example: false } } } } }
          },
          responses: { '200': { description: 'Status uğurla dəyişdirildi' } }
        }
      },
      '/api/admin/users/{id}/contact': {
        patch: {
          tags: ['Admin - User Management'],
          summary: "Adminin, istifadəçinin e-poçt və ya telefon nömrəsini dəyişməsi",
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            description: 'Məlumatları dəyişdiriləcək istifadəçinin ID-si',
            schema: { type: 'string', format: 'uuid' }
          }],
          requestBody: {
            description: "Dəyişmək istədiyiniz sahələri göndərin. Hər ikisi də opsionaldır.",
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'new.email@example.com'
                    },
                    phoneNumber: {
                      type: 'string',
                      example: '+994551234567'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Əlaqə məlumatları uğurla dəyişdirildi' },
            '403': { description: 'İcazə yoxdur' },
            '404': { description: 'İstifadəçi tapılmadı' },
            '409': { description: 'Bu e-poçt və ya telefon nömrəsi artıq istifadə olunur' }
          }
        }
      },
      // Admin - Update User Subscription       ===
      '/api/admin/users/{id}/subscription': {
        patch: {
          tags: ['Admin - User Management'],
          summary: "İstifadəçinin abunəlik statusunu dəyişir (FREE/PREMIUM)",
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            description: 'Statusu dəyişdiriləcək istifadəçinin ID-si',
            schema: { type: 'string', format: 'uuid' }
          }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    subscription: {
                      type: 'string',
                      description: 'Yeni abunəlik statusu',
                      enum: ['FREE', 'PREMIUM'],
                      example: 'PREMIUM'
                    }
                  },
                  required: ['subscription']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Abunəlik statusu uğurla dəyişdirildi' },
            '400': { description: 'Yanlış abunəlik tipi göndərildi' },
            '403': { description: 'İcazə yoxdur' },
            '404': { description: 'İstifadəçi tapılmadı' }
          }
        }
      },
      '/api/admin/users/{id}/connections': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçinin bütün bağlantılarını (match) gətirir',
          security: [{ bearerAuth: [] }],

          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users/{id}/reports': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçiyə qarşı edilmiş bütün şikayətləri gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users/{id}/activity': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçinin son fəaliyyətini gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/verifications': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Gözləmədə olan bütün profil təsdiqləmə sorğularını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: {
            '200': { description: 'Gözləmədə olan sorğuların siyahısı' },
            '403': { description: 'İcazə yoxdur' }
          }
        }
      },
      '/api/admin/verifications': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Profil təsdiqləmə sorğularını gətirir (statusa görə filtrləmə ilə)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            {
              name: 'status',
              in: 'query',
              description: "Statusa görə filtrlə. Mümkün dəyərlər: PENDING, APPROVED, REJECTED. Boş buraxılsa hamısı gəlir.",
              schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] }
            }
          ],
          responses: {
            '200': { description: 'Sorğuların siyahısı' },
            '403': { description: 'İcazə yoxdur' }
          }
        }
      },
      '/api/admin/verifications/{profileId}/status': {
        patch: {
          tags: ['Admin - User Management'],
          summary: 'Bir profilin verifikasiya statusunu dəyişir',
          description: "Bu endpoint adminə, səhvən təsdiqlənmiş sorğunu geri qaytarmaq və ya statusu birbaşa dəyişmək imkanı verir.",
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'profileId',
            in: 'path',
            required: true,
            description: 'Statusu dəyişdiriləcək profilin ID-si',
            schema: { type: 'string' } // ID-nin string olduğunu nəzərə alırıq
          }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['PENDING', 'APPROVED', 'REJECTED'],
                      example: 'REJECTED'
                    }
                  },
                  required: ['status']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Status uğurla dəyişdirildi' },
            '400': { description: 'Yanlış status dəyəri göndərildi' },
            '403': { description: 'İcazə yoxdur' },
            '404': { description: 'Profil tapılmadı' }
          }
        }
      },
      '/api/admin/users/banned': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Banlanmış (deaktiv edilmiş) bütün istifadəçilərin siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users/{id}': {
        delete: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçini və ona aid bütün məlumatları sistemdən tamamilə silir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '204': { description: 'İstifadəçi uğurla silindi' },
            '400': { description: 'Admin özünü silə bilməz' }
          }
        }
      },
      '/api/admin/roles': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bütün mövcud rolların siyahısını gətirir (məs: USER, ADMIN)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Success' }
          }
        }
      },
      '/api/admin/reports': {
        get: {
          tags: ['Admin'],
          summary: 'Bütün şikayətlərin siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Şikayətlərin siyahısı' } }
        }
      },
      '/api/admin/reports/{id}/status': {
        patch: {
          tags: ['Admin'],
          summary: 'Şikayətin statusunu dəyişir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'RESOLVED' } } } } }
          },
          responses: { '200': { description: 'Status uğurla dəyişdirildi' } }
        }
      },
      '/api/admin/messages/{id}': {
        delete: {
          tags: ['Admin - Moderation'],
          summary: 'Bir mesajı ID-sinə görə silir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '204': { description: 'Mesaj uğurla silindi' } }
        }
      },

      '/api/admin/venues': {
        get: {
          tags: ['Admin - Content'],
          summary: 'Bütün məkanların siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Success' } }
        },
        post: {
          tags: ['Admin - Content'],
          summary: 'Yeni məkan yaradır',
          security: [{ bearerAuth: [] }],

          requestBody: {
            required: true,
            content: {
              'application/json':
              {
                schema: {
                  type: 'object',
                  properties:
                  {
                    name: { type: 'string' },
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                    category: {
                      type: 'string',
                      enum: ['GENERAL', 'CAFE', 'RESTAURANT', 'UNIVERSITY', 'BAR', 'EVENT_SPACE'],
                      example: 'CAFE'
                    }
                  }
                }
              }
            }
          },
          responses: { '201': { description: 'Created' } }
        }
      },
      '/api/admin/venues/{id}': {
        patch: { tags: ['Admin - Content'], summary: 'Məkanı yeniləyir', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } }, responses: { '200': { description: 'Success' } } },
        delete: { tags: ['Admin - Content'], summary: 'Məkanı silir', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '204': { description: 'No Content' } } }
      },

      '/api/admin/venues/{id}/activity': {
        get: {
          tags: ['Admin - Content'],
          summary: 'Bir məkanın son 24 saatdakı aktivliyini (check-in sayını) gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
          ],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/venues/{id}/status': {
        patch: {
          tags: ['Admin - Content'],
          summary: 'Məkanın statusunu (aktiv/deaktiv) dəyişir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { isActive: { type: 'boolean' } } } } }
          },
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/venues/{id}/feature': {
        patch: {
          tags: ['Admin - Content'],
          summary: 'Məkanı "Featured" (önə çıxarılan) edir və ya ləğv edir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { isFeatured: { type: 'boolean' } } } } }
          },
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/categories': {
        get: { tags: ['Admin - Content'], summary: 'Bütün maraq kateqoriyalarını gətirir', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Success' } } },
        post: { tags: ['Admin - Content'], summary: 'Yeni maraq kateqoriyası yaradır', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' } } }
      },
      '/api/admin/categories/{id}': {
        patch: {
          tags: ['Admin - Content'],
          summary: 'Maraq kateqoriyasını yeniləyir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } }
          },
          responses: { '200': { description: 'Success' } }
        },
        delete: {
          tags: ['Admin - Content'],
          summary: 'Bir kateqoriyanı və ona aid bütün maraqları silir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '204': { description: 'No Content' } }
        }
      },
      '/api/admin/interests': {
        post: { tags: ['Admin - Content'], summary: 'Yeni maraq yaradır', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, categoryId: { type: 'integer' } } } } } }, responses: { '201': { description: 'Created' } } }
      },
      '/api/admin/interests/{id}': {
        delete: { tags: ['Admin - Content'], summary: 'Marağı silir', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '204': { description: 'No Content' } } }
      },
      '/api/admin/notifications/broadcast': {
        post: {
          tags: ['Admin - Notification'],
          summary: 'Bütün istifadəçilərə kütləvi push bildiriş göndərir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } } } } }
          },
          responses: { '200': { description: 'Bildiriş göndərmə prosesi başlandı' } }
        }
      },
      '/api/admin/notifications/history': {
        get: {
          tags: ['Admin - Notification'],
          summary: 'Göndərilmiş kütləvi bildirişlərin tarixçəsini gətirir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Success' } }
        }
      },
      //  Admin - Icebreaker Question Management ===
      '/api/admin/icebreakers': {
        get: {
          tags: ['Admin - Content'],
          summary: 'Bütün "Buz Sındıran" sualların siyahısını gətirir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Sualların siyahısı uğurla qaytarıldı' } }
        },
        post: {
          tags: ['Admin - Content'],
          summary: 'Yeni bir "Buz Sındıran" sual yaradır',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    text: {
                      type: 'string',
                      example: 'Əgər bir super gücün olsaydı, nə olardı?'
                    }
                  },
                  required: ['text']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Sual uğurla yaradıldı' },
            '400': { description: 'Sual mətni boşdur' }
          }
        }
      },
      '/api/admin/icebreakers/{id}': {
        patch: {
          tags: ['Admin - Content'],
          summary: 'Mövcud bir "Buz Sındıran" sualı yeniləyir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    text: {
                      type: 'string',
                      example: 'Bu günə qədər getdiyin ən maraqlı yer haradır?'
                    }
                  },
                  required: ['text']
                }
              }
            }
          },
          responses: { '200': { description: 'Sual uğurla yeniləndi' } }
        },
        delete: {
          tags: ['Admin - Content'],
          summary: 'Bir "Buz Sındıran" sualı silir',
          security: [{ bearerAuth: [] }],
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }],
          responses: { '204': { description: 'Sual uğurla silindi' } }
        }
      },
      '/api/admin/stats/calculate-venue-stats': {
        post: {
          tags: ['Admin - Statistics'],
          summary: 'Məkan statistikalarının hesablanmasını manual olaraq başladır.(test meqsedlidi prod-a getmeyecek)',
          description: "Bu endpoint, normalda gündə bir dəfə avtomatik işə düşən statistika hesablama prosesini dərhal başlatmaq üçün istifadə olunur.",
          security: [{ bearerAuth: [] }],
          responses: {
            '2022': { description: 'Hesablama prosesi uğurla başladıldı' },
            '403': { description: 'İcazə yoxdur' }
          }
        }
      },
      '/api/admin/badges': {
        get: {
          tags: ['Admin - Gamification'],
          summary: 'Sistemdəki bütün nişanları gətirir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Bütün nişanların siyahısı' } }
        },
        post: {
          tags: ['Admin - Gamification'],
          summary: 'Yeni bir nişan yaradır',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'SOCIAL_BUTTERFLY_1' },
                    name: { type: 'string', example: 'Sosial Kəpənək' },
                    description: { type: 'string', example: '10 fərqli istifadəçi ilə "match" ol' },
                    iconUrl: { type: 'string', example: 'http://example.com/icon.png' }
                  },
                  required: ['code', 'name', 'description', 'iconUrl']
                }
              }
            }
          },
          responses: { '201': { description: 'Nişan uğurla yaradıldı' } }
        }
      },
      '/api/admin/badges/{id}': {
        patch: {
          tags: ['Admin - Gamification'],
          summary: 'Mövcud bir nişanı yeniləyir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          // --- TAM VERSİYA BURADADIR ---
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'SOCIAL_BUTTERFLY_1' },
                    name: { type: 'string', example: 'Sosial Kəpənək' },
                    description: { type: 'string', example: '10 fərqli istifadəçi ilə "match" ol' },
                    iconUrl: { type: 'string', example: 'http://example.com/icon.png' }
                  }
                  // Qeyd: PATCH sorğusu olduğu üçün heç bir sahənin məcburi olmadığını göstərmək üçün
                  // "required" massivini burada qeyd etmirik.
                }
              }
            }
          },
          // --- TAM VERSİYA BİTDİ ---
          responses: {
            '200': { description: 'Nişan uğurla yeniləndi' },
            '404': { description: 'Bu ID ilə nişan tapılmadı' }
          }
        },
        delete: {
          tags: ['Admin - Gamification'],
          summary: 'Bir nişanı silir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '204': { description: 'Nişan uğurla silindi' },
            '404': { description: 'Bu ID ilə nişan tapılmadı' }
          }
        }
      },
      //  Admin -Logs ===
      '/api/admin/logs': {
        get: {
          tags: ['Admin - Audit'],
          summary: 'Bütün admin fəaliyyət jurnalını gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'Fəaliyyət jurnalının siyahısı' }
          }
        }
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      },
      schemas: {
        RegisterUserInput: {
          type: 'object',
          required: ['email', 'password', 'name', 'age', 'gender'],
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            password: { type: 'string', example: 'password123' },
            name: { type: 'string', example: 'Test User' },
            age: { type: 'integer', example: 25 },
            gender: { type: 'string', example: 'MALE' },
          }
        },
        LoginUserInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            password: { type: 'string', example: 'password123' },
          }
        },
        GoogleLoginInput: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'Mobil tətbiqin Google SDK-dan aldığı ID Token',
              example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAifQ...'
            }
          }
        },
        UpdateProfileInput: {
          type: 'object',
          properties: {
            bio: { type: 'string', example: 'Yeni bio mətni' },
            interestIds: { type: 'array', items: { type: 'integer' }, example: [1, 5] },
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            senderId: { type: 'string' },
            connectionId: { type: 'integer' },
            sender: {
              type: 'object',
              properties: {
                profile: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    avatarUrl: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        RegisterDeviceInput: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'Firebase Cloud Messaging (FCM) tərəfindən verilən unikal cihaz tokeni',
              example: 'bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1...'
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            type: { type: 'string', example: 'NEW_CONNECTION' },
            content: { type: 'string', example: 'Yeni Bağlantı! Xəyal ilə yeni bir bağlantı qurdunuz!' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            userId: { type: 'string', format: 'uuid' }
          }
        },
        ReportUserInput: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: {
              type: 'string',
              description: 'Şikayətin səbəbi (məsələn, "Spam", "Təhqir")',
              example: 'Spam profil'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalUsers: { type: 'integer', example: 150 },
            newUsersToday: { type: 'integer', example: 5 },
            activeSessions: { type: 'integer', example: 25 },
            totalConnections: { type: 'integer', example: 45 },
            pendingReports: { type: 'integer', example: 3 },
          }
        }, ForgotPasswordInput: {
          type: 'object',
          properties: { email: { type: 'string', example: 'user@example.com' } }
        },
        VerifyOtpInput: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            token: { type: 'string', example: '123456' }
          }
        },
        ResetPasswordInput: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            token: { type: 'string', example: '123456' },
            password: { type: 'string', example: 'yeniSifre123' }
          }
        }
      }
    }
  },
  apis: [],
};

module.exports = options;