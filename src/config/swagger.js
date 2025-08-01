
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
      '/api/profile/me/avatar': {
        patch: {
          tags: ['Profile'],
          summary: 'Hazırkı istifadəçinin profil şəklini (avatar) yükləyir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              // Fayl yükləmələri üçün bu format istifadə olunur
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    avatar: {
                      type: 'string',
                      format: 'binary' // Bu, fayl olduğunu bildirir
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Profil şəkli uğurla yeniləndi' },
            '400': { description: 'Heç bir fayl yüklənmədi' },
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
      '/api/interest/seed': {
        post: {
          tags: ['Interest'],
          summary: '(Yalnız Test Üçün) Databazanı ilkin maraqlarla doldurur',
          responses: {
            '201': { description: 'Databaza uğurla dolduruldu' }
          }
        }
      },
      '/api/location/check-in': {
        post: {
          tags: ['Location'],
          summary: 'İstifadəçini verilən koordinatlara ən yaxın məkana "check-in" edir',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', example: 40.3777 },
                    longitude: { type: 'number', example: 49.8344 }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Uğurlu check-in' },
            '401': { description: 'Avtorizasiya xətası' },
            '404': {
              description: 'Yaxınlıqda məkan tapılmadı',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
            }
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
      '/api/chat/{connectionId}/messages': {
        get: {
          tags: ['Chat'],
          summary: 'Bir bağlantıya aid bütün söhbət tarixçəsini gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [
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
      '/api/notification': {
        get: {
          tags: ['Notification'],
          summary: 'Hazırkı istifadəçinin bütün bildirişlərini gətirir',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Bildirişlərin siyahısı' } }
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

      '/api/connections': {
        get: {
          tags: ['Connection'],
          summary: 'Hazırkı istifadəçinin bütün bağlantılarının siyahısını gətirir',
          security: [{ bearerAuth: [] }],
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
      '/api/admin/users/{id}/connections': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçinin bütün bağlantılarını (match) gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users/{id}/reports': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçiyə qarşı edilmiş bütün şikayətləri gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users/{id}/activity': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Bir istifadəçinin son fəaliyyətini gətirir',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Success' } }
        }
      },
      '/api/admin/users/banned': {
        get: {
          tags: ['Admin - User Management'],
          summary: 'Banlanmış (deaktiv edilmiş) bütün istifadəçilərin siyahısını gətirir',
          security: [{ bearerAuth: [] }],
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
        get: { tags: ['Admin - Content'], summary: 'Bütün məkanların siyahısını gətirir', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Success' } } },
        post: { tags: ['Admin - Content'], summary: 'Yeni məkan yaradır', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' } } } } } }, responses: { '201': { description: 'Created' } } }
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
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
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
            avatarUrl: { type: 'string', example: 'http://example.com/avatar.png' }
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
        },ForgotPasswordInput: {
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